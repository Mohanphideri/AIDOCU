const express = require('express');
const controller = require('../controllers/resultController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.get('/', authenticate, requireRole('STUDENT'), controller.listMine);
router.get('/:resultId', authenticate, requireRole('STUDENT'), controller.getMyResult);
router.post('/:resultId/finalize', authenticate, requireRole('ADMIN'), controller.finalizeResult);
router.post('/:resultId/correct', authenticate, requireRole('ADMIN'), controller.correctResult);

module.exports = router;
