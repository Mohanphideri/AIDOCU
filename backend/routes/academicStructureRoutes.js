const express = require('express');
const controllers = require('../controllers/academicStructureController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// Reads are available to any authenticated staff role (students access
// exam-relevant academic data indirectly via exam listings, not this API);
// writes are Admin-only.
const readRoles = ['ADMIN', 'FACULTY', 'SUPERVISOR'];

function mount(path, controller) {
  const sub = express.Router();
  sub.get('/', authenticate, requireRole(...readRoles), controller.list);
  sub.get('/:id', authenticate, requireRole(...readRoles), controller.getById);
  sub.post('/', authenticate, requireRole('ADMIN'), controller.create);
  sub.put('/:id', authenticate, requireRole('ADMIN'), controller.update);
  sub.delete('/:id', authenticate, requireRole('ADMIN'), controller.deactivate);
  router.use(path, sub);
}

mount('/universities', controllers.university);
mount('/sessions', controllers.academicSession);
mount('/faculties', controllers.faculty);
mount('/departments', controllers.department);
mount('/programmes', controllers.programme);
mount('/semesters', controllers.semester);
mount('/subjects', controllers.subject);

module.exports = router;
