const express = require('express');
const controller = require('../controllers/queryController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', controller.listQueries);
router.get('/:queryId', controller.getQuery);
router.post('/:queryId/resolve', controller.resolveQuery);

module.exports = router;
