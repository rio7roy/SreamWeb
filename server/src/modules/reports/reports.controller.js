const reportsService = require('./reports.service');

/**
 * GET /api/reports/users/excel
 */
async function getUsersExcel(req, res, next) {
  try {
    const buffer = await reportsService.generateUserExcelReport();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=stream-users-${Date.now()}.xlsx`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/users/pdf
 */
async function getUsersPdf(req, res, next) {
  try {
    const buffer = await reportsService.generateUserPdfReport();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=stream-users-${Date.now()}.pdf`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}
const { generateMonthEndPdfReport } = require('./monthEndPdf.service');

/**
 * GET /api/reports/month-end-pdf
 */
async function getMonthEndPdf(req, res, next) {
  try {
    const { month, year } = req.query;
    const buffer = await generateMonthEndPdfReport(month, year);

    res.setHeader('Content-Type', 'application/pdf');
    let filename = 'stream-month-end-report';
    if (month && year) filename += `-${year}-${month}`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

const { generateExpertEventsPdfReport } = require('./expertEventsPdf.service');

/**
 * GET /api/reports/expert/:expertId/pdf
 */
async function getExpertEventsPdf(req, res, next) {
  try {
    const { expertId } = req.params;
    const { month, year } = req.query;
    const buffer = await generateExpertEventsPdfReport(expertId, month, year);

    res.setHeader('Content-Type', 'application/pdf');
    let filename = `expert-activity-${expertId}`;
    if (month) filename += `-m${month}`;
    if (year) filename += `-y${year}`;
    
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
    return res.send(buffer);
  } catch (err) {
    if (err.message === 'Expert not found') {
      return res.status(404).json({ message: 'Expert not found' });
    }
    next(err);
  }
}

module.exports = { getUsersExcel, getUsersPdf, getMonthEndPdf, getExpertEventsPdf };
