const academicStructureService = require('../services/academicStructureService');
const { success } = require('../utils/apiResponse');

function buildHandlers(entityKey) {
  const service = academicStructureService[entityKey];

  return {
    create: async (req, res, next) => {
      try {
        const doc = await service.create(req.body, req.user.id);
        return success(res, doc, `${entityKey} created`, 201);
      } catch (err) {
        return next(err);
      }
    },
    list: async (req, res, next) => {
      try {
        const docs = await service.list(req.query);
        return success(res, docs);
      } catch (err) {
        return next(err);
      }
    },
    getById: async (req, res, next) => {
      try {
        const doc = await service.getById(req.params.id);
        return success(res, doc);
      } catch (err) {
        return next(err);
      }
    },
    update: async (req, res, next) => {
      try {
        const doc = await service.update(req.params.id, req.body, req.user.id);
        return success(res, doc, `${entityKey} updated`);
      } catch (err) {
        return next(err);
      }
    },
    deactivate: async (req, res, next) => {
      try {
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
