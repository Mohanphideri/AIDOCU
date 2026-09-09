const { ExamQuestion, QuestionVersion, Translation, Paper } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');

// Provider architecture: translateText() delegates to a named provider so
// Bhashini/IndicTrans2 can be swapped in later without changing callers.
// Only a mock/local provider is implemented for now.
async function mockLocalProvider(text, targetLanguage) {
  return `[${targetLanguage.toUpperCase()}] ${text}`;
}

const PROVIDERS = {
  MOCK_LOCAL: mockLocalProvider,
  // BHASHINI: bhashiniProvider,      // TODO: implement when credentials available
  // INDICTRANS2: indicTrans2Provider, // TODO: implement when credentials available
};

async function translateQuestionVersion(questionVersion, targetLanguage, providerName = 'MOCK_LOCAL') {
  const provider = PROVIDERS[providerName];
  if (!provider) throw new ApiError(`Unknown translation provider: ${providerName}`, 400, 'UNKNOWN_PROVIDER');

  // Only questionText and options are translated — never IDs, marks, or
  // correct-answer metadata.
  const questionText = await provider(questionVersion.questionText, targetLanguage);
  const options = {
    A: await provider(questionVersion.options.A, targetLanguage),
    B: await provider(questionVersion.options.B, targetLanguage),
    C: await provider(questionVersion.options.C, targetLanguage),
    D: await provider(questionVersion.options.D, targetLanguage),
  };

  return { questionText, options };
}

/**
 * Translation should be generated after paper locking (per spec section 35).
 * Creates one DRAFT Translation per ExamQuestion x language.
 */
async function generateTranslationsForPaper(paperId, languages, adminId, providerName = 'MOCK_LOCAL') {
  const paper = await Paper.findById(paperId);
  if (!paper) throw new ApiError('Paper not found', 404, 'NOT_FOUND');
  if (paper.status !== 'LOCKED') {
    throw new ApiError('Translations can only be generated for a locked paper', 400, 'PAPER_NOT_LOCKED');
  }

  const examQuestions = await ExamQuestion.find({ paperId });
  const created = [];

  for (const eq of examQuestions) {
    const questionVersion = await QuestionVersion.findById(eq.questionVersionId);
    for (const language of languages) {
      const existing = await Translation.findOne({ examQuestionId: eq._id, language }).sort({ versionNumber: -1 });
      if (existing) continue; // already generated — use regenerateTranslation() to create a new version

      const { questionText, options } = await translateQuestionVersion(questionVersion, language, providerName);
      const translation = await Translation.create({
        examQuestionId: eq._id,
        questionVersionId: questionVersion._id,
        language,
        questionText,
        options,
        versionNumber: 1,
        status: 'DRAFT',
        provider: providerName,
      });
      created.push(translation._id);
    }
  }

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'TRANSLATION_GENERATED',
    entityType: 'Paper',
    entityId: paper._id,
    metadata: { languages, createdCount: created.length },
  });

  return { createdCount: created.length, createdIds: created };
}

async function reviewTranslation(translationId, edits, adminId) {
  const translation = await Translation.findById(translationId);
  if (!translation) throw new ApiError('Translation not found', 404, 'NOT_FOUND');
  if (translation.status === 'APPROVED') {
    throw new ApiError('This translation is already approved. Use regenerateTranslation to create a new version.', 400, 'ALREADY_APPROVED');
  }

  if (edits.questionText !== undefined) translation.questionText = edits.questionText;
  if (edits.options !== undefined) translation.options = { ...translation.options, ...edits.options };
  translation.status = 'IN_REVIEW';
  await translation.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'TRANSLATION_EDITED',
    entityType: 'Translation',
    entityId: translation._id,
    afterValue: edits,
  });

  return translation;
}

async function approveTranslation(translationId, adminId) {
  const translation = await Translation.findById(translationId);
  if (!translation) throw new ApiError('Translation not found', 404, 'NOT_FOUND');

  translation.status = 'APPROVED';
  translation.reviewedBy = adminId;
  translation.reviewedAt = new Date();
  await translation.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'TRANSLATION_APPROVED',
    entityType: 'Translation',
    entityId: translation._id,
  });

  return translation;
}

/**
 * Creates a NEW Translation version rather than overwriting history —
 * versioning is mandatory per spec section 36.
 */
async function regenerateTranslation(translationId, adminId, providerName) {
  const previous = await Translation.findById(translationId);
  if (!previous) throw new ApiError('Translation not found', 404, 'NOT_FOUND');

  const questionVersion = await QuestionVersion.findById(previous.questionVersionId);
  const { questionText, options } = await translateQuestionVersion(
    questionVersion,
    previous.language,
    providerName || previous.provider
  );

  const nextVersionNumber = previous.versionNumber + 1;
  const translation = await Translation.create({
    examQuestionId: previous.examQuestionId,
    questionVersionId: previous.questionVersionId,
    language: previous.language,
    questionText,
    options,
    versionNumber: nextVersionNumber,
    status: 'DRAFT',
    provider: providerName || previous.provider,
  });

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'TRANSLATION_REGENERATED',
    entityType: 'Translation',
    entityId: translation._id,
    metadata: { previousTranslationId: previous._id, versionNumber: nextVersionNumber },
  });

  return translation;
}

/** Students may only ever see APPROVED translations. */
async function getApprovedTranslation(examQuestionId, language) {
  return Translation.findOne({ examQuestionId, language, status: 'APPROVED' }).sort({ versionNumber: -1 });
}

/**
 * Admin review listing: every translation generated for a locked paper,
 * across all languages, most recent version first per (examQuestion, language).
 */
async function listTranslationsForPaper(paperId) {
  const examQuestions = await ExamQuestion.find({ paperId }).sort({ orderIndex: 1 });
  const examQuestionIds = examQuestions.map((eq) => eq._id);
  const translations = await Translation.find({ examQuestionId: { $in: examQuestionIds } }).sort({
    examQuestionId: 1,
    language: 1,
    versionNumber: -1,
  });
  return translations;
}

module.exports = {
  translateQuestionVersion,
  generateTranslationsForPaper,
  reviewTranslation,
  approveTranslation,
  regenerateTranslation,
  getApprovedTranslation,
  listTranslationsForPaper,
};
