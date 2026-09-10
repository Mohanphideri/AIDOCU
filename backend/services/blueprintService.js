const { ExamBlueprint, Exam } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');

function validateSections(sections) {
  if (!Array.isArray(sections) || !sections.length) {
    throw new ApiError('Blueprint must have at least one section', 400, 'INVALID_BLUEPRINT');
  }
  for (const section of sections) {
    if (!section.name || !section.questionCount || section.marksPerQuestion === undefined) {
      throw new ApiError('Each section requires a name, questionCount, and marksPerQuestion', 400, 'INVALID_BLUEPRINT');
    }
    const pctSum = (dist) => (dist || []).reduce((sum, d) => sum + (d.percentage || 0), 0);
    for (const [label, dist] of [
      ['unitDistribution', section.unitDistribution],
      ['topicDistribution', section.topicDistribution],
      ['difficultyDistribution', section.difficultyDistribution],
    ]) {
      if (dist && dist.length && Math.round(pctSum(dist)) !== 100) {
        throw new ApiError(`${label} in section "${section.name}" must sum to 100%`, 400, 'INVALID_DISTRIBUTION');
      }
    }
  }
}

async function createBlueprint({ examId, sections, adminId }) {
  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError('Exam not found', 404, 'NOT_FOUND');

  validateSections(sections);

  const existing = await ExamBlueprint.findOne({ examId });
  if (existing) throw new ApiError('A blueprint already exists for this exam. Use update instead.', 409, 'ALREADY_EXISTS');

  const blueprint = await ExamBlueprint.create({ examId, sections, createdBy: adminId });

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'BLUEPRINT_CREATED',
    entityType: 'ExamBlueprint',
    entityId: blueprint._id,
    metadata: { examId },
  });

  return blueprint;
}

async function getBlueprintByExam(examId) {
  const { ExamBlueprint } = require('../models');
  return ExamBlueprint.findOne({ examId });
}

async function updateBlueprint(blueprintId, sections, adminId) {
  const blueprint = await ExamBlueprint.findById(blueprintId);
  if (!blueprint) throw new ApiError('Blueprint not found', 404, 'NOT_FOUND');

  const { Paper } = require('../models');
  const lockedPaper = await Paper.findOne({ blueprintId: blueprint._id, status: 'LOCKED' });
  if (lockedPaper) {
    throw new ApiError(
      'This blueprint is locked to a generated, locked paper and can no longer be edited.',
      409,
      'BLUEPRINT_LOCKED'
    );
  }

  validateSections(sections);

  const before = blueprint.sections;
  blueprint.sections = sections;
  await blueprint.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'BLUEPRINT_UPDATED',
    entityType: 'ExamBlueprint',
    entityId: blueprint._id,
    beforeValue: before,
    afterValue: sections,
  });

  return blueprint;
}

module.exports = { createBlueprint, updateBlueprint, getBlueprintByExam, validateSections };
