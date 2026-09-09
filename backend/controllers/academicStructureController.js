const academicStructureService = require('../services/academicStructureService');
const { success } = require('../utils/apiResponse');

function buildHandlers(entityKey) {
  const service = academicStructureService[entityKey];

  return {
    create: async (req, res, next) => {
      try {
        const payload = { ...req.body };
        if (entityKey !== 'university') payload.universityId = req.user.universityId || payload.universityId;
        const doc = await service.create(payload, req.user.id);
        return success(res, doc, `${entityKey} created`, 201);
      } catch (err) {
        return next(err);
      }
    },
    list: async (req, res, next) => {
      try {
        const filter = { ...req.query };
        if (entityKey !== 'university') filter.universityId = req.user.universityId;
        else filter._id = req.user.universityId;
        const docs = await service.list(filter);
        return success(res, docs);
      } catch (err) {
        return next(err);
      }
    },
    getById: async (req, res, next) => {
      try {
        const doc = await service.getById(req.params.id);
        if (entityKey !== 'university' && String(doc.universityId) !== String(req.user.universityId)) { throw new (require('../middleware/errorHandler').ApiError)('Resource not found', 404, 'NOT_FOUND'); }
        return success(res, doc);
      } catch (err) {
        return next(err);
      }
    },
    update: async (req, res, next) => {
      try {
        const existing = await service.getById(req.params.id);
        if (entityKey !== 'university' && String(existing.universityId) !== String(req.user.universityId)) { throw new (require('../middleware/errorHandler').ApiError)('Resource not found', 404, 'NOT_FOUND'); }
        const changes = { ...req.body };
        if (entityKey !== 'university') changes.universityId = req.user.universityId;
        const doc = await service.update(req.params.id, changes, req.user.id);
        return success(res, doc, `${entityKey} updated`);
      } catch (err) {
        return next(err);
      }
    },
    deactivate: async (req, res, next) => {
      try {
        const existing = await service.getById(req.params.id);
        if (entityKey !== 'university' && String(existing.universityId) !== String(req.user.universityId)) { throw new (require('../middleware/errorHandler').ApiError)('Resource not found', 404, 'NOT_FOUND'); }
        const doc = await service.deactivate(req.params.id, req.user.id);
        return success(res, doc, `${entityKey} deactivated`);
      } catch (err) {
        return next(err);
      }
    },
  };
}

module.exports = {
  university: buildHandlers('university'),
  academicSession: buildHandlers('academicSession'),
  faculty: buildHandlers('faculty'),
  department: buildHandlers('department'),
  programme: buildHandlers('programme'),
  semester: buildHandlers('semester'),
  subject: buildHandlers('subject'),
};
