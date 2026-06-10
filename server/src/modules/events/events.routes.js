const { Router } = require('express');
const eventsController = require('./events.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { upload, compressImages } = require('../../middleware/upload.middleware');

const router = Router();

// Create/Submit an event report
router.post(
  '/',
  authenticate,
  upload.array('photos', 10), // Max 10 photos per report
  compressImages,
  eventsController.createEvent
);

// Get event stats for a BRC
router.get('/stats', authenticate, eventsController.getEventStats);

// Get drafted events for a BRC
router.get('/drafts', authenticate, eventsController.getDrafts);

// Get all submitted events
router.get('/', authenticate, eventsController.getEvents);

// Export events as Excel
router.get('/export/excel', authenticate, eventsController.exportEventsExcel);

// Export events as PDF
router.get('/export/pdf', authenticate, eventsController.exportEventsPdf);

// Update an existing event (e.g., submitting a draft)
router.put(
  '/:id',
  authenticate,
  upload.array('photos', 10),
  compressImages,
  eventsController.updateEvent
);

// Delete an event/draft
router.delete('/:id', authenticate, eventsController.deleteEvent);

// Upload PDF report for an event
router.post(
  '/:id/report',
  authenticate,
  upload.single('reportPdf'),
  eventsController.uploadReportPdf
);

module.exports = router;
