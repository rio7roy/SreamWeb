const express = require('express');
const multer = require('multer');
const stocksController = require('./stocks.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Protect all stock routes
router.use(authenticate);
// Assuming only ADMIN, STREAM_LAB, and EXPERT roles can manage stocks
router.use(authorize('ADMIN', 'STREAM_LAB', 'EXPERT'));

// Get stocks (monitoring)
router.get('/', stocksController.getStocks);

// Create single stock
router.post('/', stocksController.createStock);

// Update single stock
router.put('/:id', stocksController.updateStock);

// Download stock report
router.get('/reports/download', stocksController.downloadStockReport);

// Delete single stock
router.delete('/:id', stocksController.deleteStock);

module.exports = router;
