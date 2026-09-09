const studentAdminService = require('../services/studentAdminService');
const { success } = require('../utils/apiResponse');

async function list(req, res, next) {
  try {
    const { search, accountStatus, universityId, programmeId, departmentId, semesterId, page, limit } = req.query;
    const result = await studentAdminService.listStudents(
      { search, accountStatus, universityId: req.user.universityId, programmeId, departmentId, semesterId },
      { page: Number(page) || 1, limit: Number(limit) || 25 }
    );
    return success(res, result);
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const student = await studentAdminService.getStudent(req.params.studentId);
    return success(res, student);
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { accountStatus, reason } = req.body;
    const student = await studentAdminService.updateStudentStatus(req.params.studentId, accountStatus, req.user.id, reason);
    return success(res, student, 'Student status updated');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getOne, updateStatus };
