const express = require('express');
const controller = require('../controllers/translationController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.post('/generate', controller.generate);
router.get('/paper/:paperId', controller.listForPaper);
router.put('/:translationId', controller.review);
router.post('/:translationId/approve', controller.approve);
router.post('/:translationId/regenerate', controller.regenerate);

module.exports = router;
