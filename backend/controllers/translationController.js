const translationService = require('../services/translationService');
const { success } = require('../utils/apiResponse');

async function generate(req, res, next) {
  try {
    const { paperId, languages, provider } = req.body;
    const result = await translationService.generateTranslationsForPaper(paperId, languages, req.user.id, provider);
    return success(res, result, 'Translations generated');
  } catch (err) {
    return next(err);
  }
}

async function review(req, res, next) {
  try {
    const translation = await translationService.reviewTranslation(req.params.translationId, req.body, req.user.id);
    return success(res, translation, 'Translation updated');
  } catch (err) {
    return next(err);
  }
}

async function approve(req, res, next) {
  try {
    const translation = await translationService.approveTranslation(req.params.translationId, req.user.id);
    return success(res, translation, 'Translation approved');
  } catch (err) {
    return next(err);
  }
}

async function regenerate(req, res, next) {
  try {
    const translation = await translationService.regenerateTranslation(req.params.translationId, req.user.id, req.body.provider);
    return success(res, translation, 'Translation regenerated');
  } catch (err) {
    return next(err);
  }
}

async function listForPaper(req, res, next) {
  try {
    const translations = await translationService.listTranslationsForPaper(req.params.paperId);
    return success(res, translations);
  } catch (err) {
    return next(err);
  }
}

module.exports = { generate, review, approve, regenerate, listForPaper };
