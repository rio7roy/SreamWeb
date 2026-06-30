const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { success, error } = require('../../utils/response');
const stocksService = require('./stocks.service');
const fs = require('fs');
const path = require('path');

function checkAndSendStockAlert(stock) {
  const qty = stock.quantity;
  if (qty > 5) return;

  let alertLevel = '';
  if (qty === 0) alertLevel = 'NO STOCK ALERT';
  else if (qty > 0 && qty <= 5) alertLevel = 'LOW STOCK ALERT';

  if (!alertLevel) return;

  try {
    const messagesPath = path.join(__dirname, '../../../data/messages.json');
    let messages = [];
    if (fs.existsSync(messagesPath)) {
      messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
    }

    const newAlert = {
      id: require('crypto').randomUUID ? require('crypto').randomUUID() : Date.now().toString(),
      to: ["ADMIN"],
      from: "System Alerts",
      content: `${alertLevel}: ${stock.itemName} (${stock.category}) at ${stock.brc || stock.district || 'Hub'} is at ${qty} quantity.`,
      scheduledFor: null,
      createdAt: new Date().toISOString()
    };

    messages.push(newAlert);
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error('Failed to send stock alert:', err);
  }
}

function sendGeneralStockNotification(messageContent) {
  try {
    const messagesPath = path.join(__dirname, '../../../data/messages.json');
    let messages = [];
    if (fs.existsSync(messagesPath)) {
      messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
    }

    const newAlert = {
      id: require('crypto').randomUUID ? require('crypto').randomUUID() : Date.now().toString(),
      to: ["ADMIN"],
      from: "System Alerts",
      content: messageContent,
      scheduledFor: null,
      createdAt: new Date().toISOString()
    };

    messages.push(newAlert);
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error('Failed to send stock notification:', err);
  }
}

/**
 * Controller for stock operations
 */
module.exports = {
  getStocks: async (req, res, next) => {
    try {
      const { brc, district, category, status, search, page, limit, source } = req.query;
      
      const result = await stocksService.listStocks({
        brc,
        district,
        category,
        status,
        search,
        source,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      });

      return success(res, result, 200, 'Stocks retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  createStock: async (req, res, next) => {
    try {
      const stockData = req.body;
      if (req.file) {
        stockData.img = `/api/uploads/${req.file.filename}`;
      }
      // Cast quantity fields to numbers to handle multipart/form-data strings
      ['newQty', 'availableQty', 'usedQty', 'damagedQty', 'consumedQty'].forEach(field => {
        if (stockData[field] !== undefined) {
          stockData[field] = parseInt(stockData[field], 10) || 0;
        }
      });
      
      
      const stock = await stocksService.createStock({
        ...stockData,
        source: 'MANUAL',
        createdByRole: req.user ? req.user.role : 'UNKNOWN',
        status: stockData.status || 'ACTIVE',
      });

      checkAndSendStockAlert(stock);
      sendGeneralStockNotification(`New stock item created: ${stock.itemName} (${stock.quantity} units)`);

      return success(res, { stock }, 201, 'Stock created successfully');
    } catch (err) {
      next(err);
    }
  },

  updateStock: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedStock = await stocksService.updateStockById(id, updates);
      
      checkAndSendStockAlert(updatedStock);
      
      return success(res, { stock: updatedStock }, 200, 'Stock updated successfully');
    } catch (err) {
      next(err);
    }
  },

  deleteStock: async (req, res, next) => {
    try {
      const { id } = req.params;
      await stocksService.deleteStockById(id);
      return success(res, null, 200, 'Stock deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  downloadStockReport: async (req, res, next) => {
    try {
      const { brc, district, format, status, category } = req.query;
      
      const filters = {};
      if (brc) filters.brc = brc;
      if (district) filters.district = district;
      if (status) filters.status = status;
      if (category) filters.category = category;
      
      const stocksData = await stocksService.getAllStocks(filters);

      if (format === 'pdf') {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Stock_Report_${brc || 'All'}.pdf"`);
        doc.pipe(res);

        doc.fontSize(20).text('Stock Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`District: ${district || 'All'} | BRC: ${brc || 'All'}`, { align: 'center' });
        doc.moveDown(2);

        if (stocksData.length === 0) {
          doc.fontSize(12).text('No stocks found for the selected filters.', { align: 'center' });
        } else {
          const brcsPath = path.join(__dirname, '../../../data/brcs.json');
          let brcs = [];
          if (fs.existsSync(brcsPath)) {
            brcs = JSON.parse(fs.readFileSync(brcsPath, 'utf8'));
          }

          const groupedStocks = {};
          
          // Determine the target BRCs for prepopulation (so empty BRCs show up if requested, or at least they are in correct order)
          let targetBrcs = brcs;
          if (district) {
            targetBrcs = targetBrcs.filter(b => b.district === district);
          }
          if (brc) {
            const [bCode, bDist] = brc.split('|');
            targetBrcs = targetBrcs.filter(b => b.code === bCode && b.district === bDist);
          }

          targetBrcs.forEach((b, idx) => {
            const key = `${b.district} -> ${b.location} / ${b.name}`;
            groupedStocks[key] = {
              items: [],
              orderIndex: idx
            };
          });

          stocksData.forEach(stock => {
            const bIndex = brcs.findIndex(x => x.code === stock.brc && x.district === stock.district);
            const b = bIndex !== -1 ? brcs[bIndex] : null;
            const brcLabel = b ? `${b.location} / ${b.name}` : (stock.brc || 'Unknown BRC');
            const key = `${stock.district || 'Unknown District'} -> ${brcLabel}`;
            
            if (!groupedStocks[key]) {
              groupedStocks[key] = {
                items: [],
                orderIndex: bIndex !== -1 ? bIndex : 999999
              };
            }
            groupedStocks[key].items.push(stock);
          });

          Object.keys(groupedStocks)
            .sort((a, b) => groupedStocks[a].orderIndex - groupedStocks[b].orderIndex)
            .forEach(groupKey => {
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e40af').text(`> ${groupKey}`);
            doc.moveDown(0.5);
            doc.font('Helvetica').fillColor('black');

            groupedStocks[groupKey].items.forEach((stock, i) => {
              const qty = stock.availableQty !== undefined ? stock.availableQty : (stock.newQty ?? stock.quantity);
              doc.fontSize(11).text(`${i + 1}. ${stock.itemName}`, { continued: true }).text(`  [${stock.category || 'N/A'}]`, { align: 'right' });
              doc.fontSize(10).fillColor('gray').text(`    Status: ${stock.status || 'ACTIVE'} | Qty: ${qty} | Unique Id: ${stock.uniqueId || stock.serialNumber || 'N/A'}`);
              doc.moveDown(0.5);
              doc.fillColor('black');
            });
            doc.moveDown(1);
          });
        }

        doc.end();
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Stock Report');

      worksheet.columns = [
        { header: 'ID', key: 'uniqueId', width: 15 },
        { header: 'Item Name', key: 'itemName', width: 35 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'District', key: 'district', width: 15 },
        { header: 'BRC', key: 'brc', width: 15 },
        { header: 'New Qty', key: 'newQty', width: 10 },
        { header: 'Available', key: 'availableQty', width: 10 },
        { header: 'Used', key: 'usedQty', width: 10 },
        { header: 'Damaged', key: 'damagedQty', width: 10 },
        { header: 'Consumed', key: 'consumedQty', width: 10 },
        { header: 'Month', key: 'month', width: 15 },
        { header: 'Remarks', key: 'remarks', width: 30 },
        { header: 'Status', key: 'status', width: 15 },
      ];

      stocksData.forEach(stock => {
        worksheet.addRow({
          ...stock,
          uniqueId: stock.uniqueId || stock.serialNumber || 'N/A',
          newQty: stock.newQty ?? stock.quantity,
          availableQty: stock.availableQty ?? stock.newQty ?? stock.quantity,
          usedQty: stock.usedQty || 0,
          damagedQty: stock.damagedQty || 0,
          consumedQty: stock.consumedQty || 0,
          month: stock.month || 'N/A'
        });
      });

      worksheet.getRow(1).font = { bold: true };

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="Stock_Report_${brc || 'All'}.csv"`);

      await workbook.csv.write(res);
      res.end();
    } catch (err) {
      next(err);
    }
  },

  bulkUploadStocks: async (req, res, next) => {
    try {
      if (!req.file) {
        return error(res, 'No file uploaded', 400);
      }

      const workbook = new ExcelJS.Workbook();
      
      if (req.file.originalname && req.file.originalname.endsWith('.csv')) {
        await workbook.csv.readFile(req.file.path);
      } else {
        await workbook.xlsx.readFile(req.file.path);
      }

      const worksheet = workbook.worksheets[0] || workbook.getWorksheet(1);
      if (!worksheet) {
        return error(res, 'Invalid spreadsheet format', 400);
      }

      const items = [];
      let headerRowFound = false;
      let headerMap = {};

      const reqDistricts = req.body.districts ? JSON.parse(req.body.districts) : [];
      const reqBrcs = req.body.brcs ? JSON.parse(req.body.brcs) : [];

      const targets = [];
      if (reqDistricts.length === 0 && reqBrcs.length === 0) {
        targets.push({ district: '', brc: '' });
      } else {
        const brcDistricts = reqBrcs.map(b => b.split('|')[1]);
        
        // If they selected a district but no BRCs, expand it to all BRCs in that district
        reqDistricts.forEach(d => {
          if (!brcDistricts.includes(d)) {
            const brcsPath = path.join(__dirname, '../../../data/brcs.json');
            if (fs.existsSync(brcsPath)) {
              const allBrcs = JSON.parse(fs.readFileSync(brcsPath, 'utf8'));
              const districtBrcs = allBrcs.filter(b => b.district === d);
              if (districtBrcs.length > 0) {
                districtBrcs.forEach(db => targets.push({ district: db.district, brc: db.code }));
              } else {
                targets.push({ district: d, brc: '' });
              }
            } else {
              targets.push({ district: d, brc: '' });
            }
          }
        });

        reqBrcs.forEach(b => targets.push({ district: b.split('|')[1], brc: b.split('|')[0] }));
      }

      worksheet.eachRow((row, rowNumber) => {
        if (!headerRowFound) {
          row.eachCell((cell, colNumber) => {
            const val = (cell.value || '').toString().toLowerCase().replace(/\s+/g, '');
            if (val.includes('item')) headerMap['itemName'] = colNumber;
            if (val.includes('category')) headerMap['category'] = colNumber;
            if (val.includes('serial') || val.includes('unique')) headerMap['uniqueId'] = colNumber;
            if (val.includes('quantity') || val.includes('qty')) headerMap['quantity'] = colNumber;
          });
          if (Object.keys(headerMap).length > 0) headerRowFound = true;
          return;
        }

        const itemName = headerMap['itemName'] ? row.getCell(headerMap['itemName']).value : null;
        if (!itemName) return;

        const quantityVal = headerMap['quantity'] ? row.getCell(headerMap['quantity']).value : 1;
        const quantity = parseInt(quantityVal, 10) || 1;

        const rowCategory = headerMap['category'] ? (row.getCell(headerMap['category']).value?.toString() || 'Uncategorized') : 'Uncategorized';
        const rowUniqueId = headerMap['uniqueId'] ? (row.getCell(headerMap['uniqueId']).value?.toString() || '') : '';

        if (reqDistricts.length > 0 || reqBrcs.length > 0) {
          targets.forEach(t => {
            items.push({
              itemName: itemName.toString(),
              category: rowCategory,
              uniqueId: rowUniqueId,
              quantity,
              district: t.district,
              brc: t.brc,
            });
          });
        } else {
          items.push({
            itemName: itemName.toString(),
            category: rowCategory,
            uniqueId: rowUniqueId,
            quantity,
            district: '',
            brc: '',
          });
        }
      });

      if (items.length === 0) {
        return error(res, 'No valid items found in upload', 400);
      }

      const { createdCount, updatedCount, stocks: affectedStocks } = await stocksService.bulkUpsertStocks(items);
      
      sendGeneralStockNotification(`Bulk Upload Completed: ${createdCount} created, ${updatedCount} updated.`);

      return success(res, { createdCount, updatedCount, stocks: affectedStocks }, 201, 'Bulk upload successful');
    } catch (err) {
      next(err);
    }
  },

  bulkUpdateStocks: async (req, res, next) => {
    try {
      const { itemName, brc, ...updates } = req.body;
      const where = {};
      if (itemName) where.itemName = itemName;
      if (brc) where.brc = brc;
      
      const result = await stocksService.bulkUpdateStocks(updates, where);
      
      let updateStr = Object.keys(updates).filter(k => updates[k]).map(k => `${k} to ${updates[k]}`).join(', ');
      if (!updateStr) updateStr = 'No specific updates';
      
      let targetStr = (itemName || brc) ? `for items matching '${itemName || 'any'}' in '${brc || 'all hubs'}'` : 'for all items across all hubs';
      sendGeneralStockNotification(`Bulk Update Completed: Applied changes (${updateStr}) ${targetStr}.`);

      return success(res, result, 200, 'Bulk update successful');
    } catch (err) {
      next(err);
    }
  },

  compareStocks: async (req, res, next) => {
    try {
      const { brc, district, months } = req.query;
      const monthsArray = months ? months.split(',') : [];
      const stocksData = await stocksService.getAllStocks({ brc, district });

      const stockHistoryAll = await stocksService.getStockHistory({ brc, district });

      const comparisonData = stocksData.map(stock => {
        const history = {};
        const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        // Filter history for just this stock
        const thisStockHistory = stockHistoryAll.filter(h => h.stockId === stock.id);
        let wasUpdatedInSelectedMonths = false;

        monthsArray.forEach(m => {
          const monthIndex = MONTHS.indexOf(m);
          if (monthIndex < 5) {
            history[m] = "Not Entered";
          } else {
            // Find the end date of the month `m` in the current year
            const currentYear = new Date().getFullYear();
            const startOfMonth = new Date(currentYear, monthIndex, 1);
            const endOfMonth = new Date(currentYear, monthIndex + 1, 0, 23, 59, 59, 999);
            
            const updatesInThisMonth = thisStockHistory.filter(h => new Date(h.updatedAt) >= startOfMonth && new Date(h.updatedAt) <= endOfMonth);
            if (updatesInThisMonth.length > 0) {
               wasUpdatedInSelectedMonths = true;
            }

            // Find the latest history entry before or on endOfMonth
            const validHistory = thisStockHistory
              .filter(h => new Date(h.updatedAt) <= endOfMonth)
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            if (validHistory.length > 0) {
              history[m] = validHistory[0].availableQty;
            } else {
              // If no history exists before end of month (e.g. not updated yet), default to current qty if it's the current month, otherwise Not Entered
              const currentMonthIndex = new Date().getMonth();
              const currentQty = stock.availableQty !== undefined ? stock.availableQty : (stock.newQty ?? stock.quantity);
              history[m] = monthIndex === currentMonthIndex ? currentQty : "Not Entered";
            }
          }
        });
        return {
          ...stock,
          history,
          _wasUpdatedInSelectedMonths: wasUpdatedInSelectedMonths
        };
      }).filter(stock => stock._wasUpdatedInSelectedMonths);

      return success(res, { stocks: comparisonData }, 200, 'Comparison data fetched successfully');
    } catch (err) {
      next(err);
    }
  }
};
