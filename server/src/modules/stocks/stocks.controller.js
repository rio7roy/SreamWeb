const ExcelJS = require('exceljs');
const { success, error } = require('../../utils/response');
const stocksService = require('./stocks.service');

/**
 * Controller for stock operations
 */
module.exports = {
  getStocks: async (req, res, next) => {
    try {
      const { brc, category, status, search, page, limit } = req.query;
      
      const result = await stocksService.listStocks({
        brc,
        category,
        status,
        search,
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
      
      const stock = await stocksService.createStock({
        ...stockData,
        source: 'MANUAL',
        status: stockData.status || 'ACTIVE',
      });

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
  }
};
