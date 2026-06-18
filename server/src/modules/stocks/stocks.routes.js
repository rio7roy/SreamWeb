const express = require('express');
const { upload, compressImage } = require('../../middleware/upload.middleware');
const stocksController = require('./stocks.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const router = express.Router();

// Protect all stock routes
router.use(authenticate);
// Assuming only ADMIN, STREAM_LAB, and EXPERT roles can manage stocks
router.use(authorize('ADMIN', 'STREAM_LAB', 'EXPERT'));

// Get stocks (monitoring)
router.get('/', stocksController.getStocks);

// Create single stock
router.post('/', upload.single('img'), compressImage, stocksController.createStock);

// Update single stock
router.put('/:id', stocksController.updateStock);

// Bulk upload
router.post('/bulk-upload', upload.single('file'), stocksController.bulkUploadStocks);

// Bulk update
router.put('/bulk-update', stocksController.bulkUpdateStocks);

// Download stock report
router.get('/reports/download', stocksController.downloadStockReport);

// Delete single stock
router.delete('/:id', stocksController.deleteStock);

module.exports = router;
