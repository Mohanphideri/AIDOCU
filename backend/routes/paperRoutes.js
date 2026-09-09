const express = require('express');
const controller = require('../controllers/paperController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.post('/generate', controller.generate);
router.put('/:paperId', controller.edit);
router.get('/:paperId/preview', controller.preview);
router.get('/:paperId/analysis', controller.analyze);
router.post('/:paperId/lock', controller.lock);

module.exports = router;
