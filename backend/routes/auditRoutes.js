const express = require('express');
const auditService = require('../services/auditService');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');
const { success } = require('../utils/apiResponse');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    const { entityType, entityId, actorId, action, from, to, page, limit } = req.query;
    const result = await auditService.search({ entityType, entityId, actorId, action, from, to, page: Number(page) || 1, limit: Number(limit) || 50 });
    return success(res, result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
