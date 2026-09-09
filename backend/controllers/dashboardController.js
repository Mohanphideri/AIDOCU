const dashboardService = require('../services/dashboardService');
const { success } = require('../utils/apiResponse');

async function getStats(req, res, next) {
  try {
    const stats = await dashboardService.getStats();
    return success(res, stats);
  } catch (err) {
    return next(err);
  }
}

async function getProctoringAlerts(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const alerts = await dashboardService.getRecentProctoringAlerts(limit);
    return success(res, alerts);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getStats, getProctoringAlerts };
