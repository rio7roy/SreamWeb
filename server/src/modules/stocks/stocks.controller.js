const ExcelJS = require('exceljs');
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
      const { brc } = req.query;
      const stocksData = await stocksService.getAllStocks({ brc });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Stock Report');

      worksheet.columns = [
        { header: 'ID', key: 'uniqueId', width: 15 },
        { header: 'Item Name', key: 'itemName', width: 35 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Serial Number', key: 'serialNumber', width: 20 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Status', key: 'status', width: 15 },
      ];

      stocksData.forEach(stock => {
        worksheet.addRow(stock);
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
        reqDistricts.forEach(d => targets.push({ district: d, brc: '' }));
        reqBrcs.forEach(b => targets.push({ district: '', brc: b }));
      }

      worksheet.eachRow((row, rowNumber) => {
        if (!headerRowFound) {
          row.eachCell((cell, colNumber) => {
            const val = (cell.value || '').toString().toLowerCase().replace(/\s+/g, '');
            if (val.includes('item')) headerMap['itemName'] = colNumber;
            if (val.includes('category')) headerMap['category'] = colNumber;
            if (val.includes('serial')) headerMap['serialNumber'] = colNumber;
            if (val.includes('quantity') || val.includes('qty')) headerMap['quantity'] = colNumber;
            if (val.includes('district')) headerMap['district'] = colNumber;
            if (val.includes('brc')) headerMap['brc'] = colNumber;
          });
          if (Object.keys(headerMap).length > 0) headerRowFound = true;
          return;
        }

        const itemName = headerMap['itemName'] ? row.getCell(headerMap['itemName']).value : null;
        if (!itemName) return;

        const quantityVal = headerMap['quantity'] ? row.getCell(headerMap['quantity']).value : 1;
        const quantity = parseInt(quantityVal, 10) || 1;

        const rowDistrict = headerMap['district'] ? (row.getCell(headerMap['district']).value?.toString() || '') : '';
        const rowBrc = headerMap['brc'] ? (row.getCell(headerMap['brc']).value?.toString() || '') : '';
        const rowCategory = headerMap['category'] ? (row.getCell(headerMap['category']).value?.toString() || 'Uncategorized') : 'Uncategorized';
        const rowSerialNumber = headerMap['serialNumber'] ? (row.getCell(headerMap['serialNumber']).value?.toString() || '') : '';

        if (reqDistricts.length > 0 || reqBrcs.length > 0) {
          targets.forEach(t => {
            items.push({
              itemName: itemName.toString(),
              category: rowCategory,
              serialNumber: rowSerialNumber,
              quantity,
              district: t.district || rowDistrict,
              brc: t.brc || rowBrc,
            });
          });
        } else {
          items.push({
            itemName: itemName.toString(),
            category: rowCategory,
            serialNumber: rowSerialNumber,
            quantity,
            district: rowDistrict,
            brc: rowBrc,
          });
        }
      });

      if (items.length === 0) {
        return error(res, 'No valid items found in upload', 400);
      }

      const { createdCount, updatedCount } = await stocksService.bulkUpsertStocks(items);
      
      sendGeneralStockNotification(`Bulk Upload Completed: ${createdCount} created, ${updatedCount} updated.`);

      return success(res, { createdCount, updatedCount }, 201, 'Bulk upload successful');
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
  }
};
