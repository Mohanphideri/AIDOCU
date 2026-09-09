const express = require('express');
const multer = require('multer');
const controller = require('../controllers/eligibilityController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router({ mergeParams: true });

router.use(authenticate, requireRole('ADMIN'));

router.post('/preview', upload.single('file'), controller.previewCsv);
router.post('/import', controller.importCsv);
router.get('/', controller.listEligibility);
router.post('/:studentId', controller.addStudent);
router.delete('/:studentId', controller.removeStudent);

module.exports = router;
