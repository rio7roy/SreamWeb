const { Router } = require('express');
const reportsController = require('./reports.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const router = Router();

// All report routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/users/excel', reportsController.getUsersExcel);
router.get('/users/pdf', reportsController.getUsersPdf);
router.get('/month-end-pdf', reportsController.getMonthEndPdf);
router.get('/expert/:expertId/pdf', reportsController.getExpertEventsPdf);

module.exports = router;
