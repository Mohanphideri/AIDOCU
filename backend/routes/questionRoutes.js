const express = require('express');
const multer = require('multer');
const controller = require('../controllers/questionController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const ALLOWED_IMPORT_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const hasAllowedExtension = ['.csv', '.xlsx', '.xls'].some((ext) => name.endsWith(ext));
    if (ALLOWED_IMPORT_MIME_TYPES.includes(file.mimetype) || hasAllowedExtension) {
      return cb(null, true);
    }
    return cb(new Error('Only .csv, .xlsx, or .xls files are allowed'));
  },
});

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', controller.search);
router.post('/', controller.create);
router.post('/import/preview', upload.single('file'), controller.previewImport);
router.post('/import', controller.importQuestions);
router.put('/:questionId', controller.update);
router.post('/:questionId/approve', controller.approve);
router.post('/:questionId/reject', controller.reject);

module.exports = router;
