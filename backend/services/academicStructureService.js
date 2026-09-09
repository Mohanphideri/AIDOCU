const {
  University,
  AcademicSession,
  Faculty,
  Department,
  Programme,
  Semester,
  Subject,
} = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');

/**
 * Generic CRUD factory for the academic hierarchy models, which all share
 * the same shape of operation (create / list / update / deactivate) and the
 * same audit requirements. Entity-specific validation (e.g. FK existence)
 * is intentionally minimal here — Mongoose ObjectId casting plus unique
 * indexes on the models themselves catch most integrity issues.
 */
function buildCrud(Model, entityType) {
  return {
    async create(payload, adminId) {
      const doc = await Model.create(payload);
      await auditService.record({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: `${entityType.toUpperCase()}_CREATED`,
        entityType,
        entityId: doc._id,
      });
      return doc;
    },

    async list(filter = {}) {
      return Model.find(filter).sort({ createdAt: -1 });
    },

    async getById(id) {
      const doc = await Model.findById(id);
      if (!doc) throw new ApiError(`${entityType} not found`, 404, 'NOT_FOUND');
      return doc;
    },

    async update(id, changes, adminId) {
      const doc = await Model.findById(id);
      if (!doc) throw new ApiError(`${entityType} not found`, 404, 'NOT_FOUND');

      const before = {};
      for (const [key, value] of Object.entries(changes)) {
        before[key] = doc[key];
        doc[key] = value;
      }
      await doc.save();

      await auditService.record({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: `${entityType.toUpperCase()}_UPDATED`,
        entityType,
        entityId: doc._id,
        beforeValue: before,
        afterValue: changes,
      });

      return doc;
    },

    async deactivate(id, adminId) {
      const doc = await Model.findById(id);
      if (!doc) throw new ApiError(`${entityType} not found`, 404, 'NOT_FOUND');
      doc.isActive = false;
      await doc.save();

      await auditService.record({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: `${entityType.toUpperCase()}_DEACTIVATED`,
        entityType,
        entityId: doc._id,
      });

      return doc;
    },
  };
}

module.exports = {
  university: buildCrud(University, 'University'),
  academicSession: buildCrud(AcademicSession, 'AcademicSession'),
  faculty: buildCrud(Faculty, 'Faculty'),
  department: buildCrud(Department, 'Department'),
  programme: buildCrud(Programme, 'Programme'),
  semester: buildCrud(Semester, 'Semester'),
  subject: buildCrud(Subject, 'Subject'),
};
