const blueprintService = require('../services/blueprintService');
const { success } = require('../utils/apiResponse');

async function create(req, res, next) {
  try {
    const blueprint = await blueprintService.createBlueprint({ ...req.body, adminId: req.user.id });
    return success(res, blueprint, 'Blueprint created', 201);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const blueprint = await blueprintService.updateBlueprint(req.params.blueprintId, req.body.sections, req.user.id);
    return success(res, blueprint, 'Blueprint updated');
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, update };
