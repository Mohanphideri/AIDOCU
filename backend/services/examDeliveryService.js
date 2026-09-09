const { ExamAttempt, AttemptQuestion, ExamQuestion, QuestionVersion, Translation, Answer } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');

/**
 * Returns the full question set for a running attempt, in the fixed order
 * captured at attempt creation, with each question's saved answer and
 * review-flag state joined in. Content is served from the locked
 * QuestionVersion (English) or the APPROVED Translation for the attempt's
 * current language — students never see a DRAFT/IN_REVIEW translation.
 */
async function getAttemptQuestions(attemptId, studentId) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  if (attempt.studentId.toString() !== studentId.toString()) {
    throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  }

  const attemptQuestions = await AttemptQuestion.find({ attemptId }).sort({ orderIndex: 1 });
  const answers = await Answer.find({ attemptId });
  const answerByAQ = new Map(answers.map((a) => [a.attemptQuestionId.toString(), a.selectedOption]));

  const questions = [];
  for (const aq of attemptQuestions) {
    const examQuestion = await ExamQuestion.findById(aq.examQuestionId);

    let questionText;
    let options;
    let translationVersionId = null;

    if (attempt.language === 'en') {
      const version = await QuestionVersion.findById(examQuestion.questionVersionId);
      questionText = version.questionText;
      options = version.options;
    } else {
      const translation = await Translation.findOne({
        examQuestionId: examQuestion._id,
        language: attempt.language,
        status: 'APPROVED',
      }).sort({ versionNumber: -1 });

      if (translation) {
        questionText = translation.questionText;
        options = translation.options;
        translationVersionId = translation._id;
      } else {
        // Fall back to English if no approved translation exists yet —
        // never show an unapproved translation.
        const version = await QuestionVersion.findById(examQuestion.questionVersionId);
        questionText = version.questionText;
        options = version.options;
      }
    }

    // Respect the fixed option display order captured at generation time.
    const orderedOptions = (examQuestion.optionOrder || ['A', 'B', 'C', 'D']).map((key) => ({
      key,
      text: options[key],
    }));

    questions.push({
      attemptQuestionId: aq._id,
      examQuestionId: examQuestion._id,
      // Included so the client can file a per-question query (StudentQuery
      // requires these to preserve exactly what the student was shown).
      examId: examQuestion.examId,
      questionId: examQuestion.questionId,
      questionVersionId: examQuestion.questionVersionId,
      translationVersionId,
      orderIndex: aq.orderIndex,
      sectionName: examQuestion.sectionName,
      marks: examQuestion.marks,
      questionText,
      options: orderedOptions,
      selectedOption: answerByAQ.get(aq._id.toString()) || null,
      markedForReview: aq.markedForReview,
      visited: aq.visited,
    });
  }

  return { language: attempt.language, questions };
}

/**
 * Changing language mid-exam must never reset answers — this only affects
 * which content is served by getAttemptQuestions() going forward.
 */
async function changeLanguage({ attemptId, studentId, language }) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  if (attempt.studentId.toString() !== studentId.toString()) {
    throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  }
  if (attempt.status !== 'ACTIVE') {
    throw new ApiError('This attempt is no longer active', 403, 'ATTEMPT_NOT_ACTIVE');
  }
  if (!['en', 'hi', 'pa', 'ta'].includes(language)) {
    throw new ApiError('Unsupported language', 400, 'INVALID_LANGUAGE');
  }

  attempt.language = language;
  await attempt.save();

  await auditService.record({
    actorId: studentId,
    actorRole: 'STUDENT',
    action: 'EXAM_LANGUAGE_CHANGED',
    entityType: 'ExamAttempt',
    entityId: attempt._id,
    metadata: { language },
  });

  return attempt;
}

module.exports = { getAttemptQuestions, changeLanguage };
