const mongoose = require('mongoose');
const { Exam, ExamBlueprint, Question, QuestionVersion, Paper, ExamQuestion } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');

/**
 * Attempts to satisfy one section's constraints from the approved question
 * bank. Returns { selected: [Question...], missing: [{ reason }] }. Never
 * returns a partially-filled section silently — callers must check
 * `missing` before treating a generation attempt as successful.
 */
async function fillSection(subjectId, section, excludeQuestionIds) {
  const selected = [];
  const missing = [];

  const reuseFilter = {};
  if (section.recentReuseRestrictionDays) {
    const cutoff = new Date(Date.now() - section.recentReuseRestrictionDays * 24 * 60 * 60 * 1000);
    reuseFilter.$or = [{ lastUsedAt: null }, { lastUsedAt: { $lt: cutoff } }];
  }

  const buckets = [];
  if (section.unitDistribution?.length) {
    for (const u of section.unitDistribution) {
      buckets.push({ unit: u.unit, count: Math.round((u.percentage / 100) * section.questionCount) });
    }
  } else {
    buckets.push({ unit: null, count: section.questionCount });
  }

  for (const bucket of buckets) {
    const query = {
      subjectId,
      status: 'APPROVED',
      questionType: section.questionType || 'MCQ',
      _id: { $nin: [...excludeQuestionIds, ...selected.map((q) => q._id)] },
      ...reuseFilter,
    };
    if (bucket.unit) query.unit = bucket.unit;

    const candidates = await Question.find(query).limit(bucket.count * 3);

    if (section.difficultyDistribution?.length) {
      for (const d of section.difficultyDistribution) {
        const neededForDifficulty = Math.round((d.percentage / 100) * bucket.count);
        const pool = candidates.filter(
          (q) => q.difficulty === d.difficulty && !selected.some((s) => s._id.equals(q._id))
        );
        const picked = pool.slice(0, neededForDifficulty);
        selected.push(...picked);
        if (picked.length < neededForDifficulty) {
          missing.push({
            reason: `${neededForDifficulty - picked.length} ${d.difficulty.toLowerCase()}-difficulty question(s) from ${bucket.unit || 'the subject'}`,
          });
        }
      }
    } else {
      const pool = candidates.filter((q) => !selected.some((s) => s._id.equals(q._id)));
      const picked = pool.slice(0, bucket.count);
      selected.push(...picked);
      if (picked.length < bucket.count) {
        missing.push({ reason: `${bucket.count - picked.length} unused question(s) from ${bucket.unit || 'the subject'}` });
      }
    }
  }

  return { selected: selected.slice(0, section.questionCount), missing };
}

/**
 * mode: 'AUTOMATIC' | 'MANUAL' | 'HYBRID'
 * manualSelections (MANUAL/HYBRID only): { [sectionName]: [questionId, ...] }
 */
async function generatePaper({ examId, blueprintId, mode, manualSelections = {}, adminId }) {
  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError('Exam not found', 404, 'NOT_FOUND');

  const blueprint = await ExamBlueprint.findById(blueprintId);
  if (!blueprint) throw new ApiError('Blueprint not found', 404, 'NOT_FOUND');

  const allMissing = [];
  const sectionAssignments = [];
  const usedQuestionIds = [];

  for (const section of blueprint.sections) {
    let sectionQuestions = [];

    if (mode === 'MANUAL') {
      const ids = manualSelections[section.name] || [];
      sectionQuestions = await Question.find({ _id: { $in: ids }, status: 'APPROVED' });
      if (sectionQuestions.length < section.questionCount) {
        allMissing.push({
          section: section.name,
          reason: `${section.questionCount - sectionQuestions.length} question(s) still need to be selected manually`,
        });
      }
    } else if (mode === 'HYBRID') {
      const manualIds = manualSelections[section.name] || [];
      const manualQuestions = await Question.find({ _id: { $in: manualIds }, status: 'APPROVED' });
      const remainingCount = Math.max(0, section.questionCount - manualQuestions.length);
      const { selected, missing } = await fillSection(
        exam.subjectId,
        { ...section, questionCount: remainingCount },
        [...usedQuestionIds, ...manualQuestions.map((q) => q._id)]
      );
      sectionQuestions = [...manualQuestions, ...selected];
      missing.forEach((m) => allMissing.push({ section: section.name, ...m }));
    } else {
      const { selected, missing } = await fillSection(exam.subjectId, section, usedQuestionIds);
      sectionQuestions = selected;
      missing.forEach((m) => allMissing.push({ section: section.name, ...m }));
    }

    sectionAssignments.push({ sectionName: section.name, marks: section.marksPerQuestion, questions: sectionQuestions });
    usedQuestionIds.push(...sectionQuestions.map((q) => q._id));
  }

  if (allMissing.length) {
    return { success: false, message: 'Blueprint could not be fully satisfied.', missing: allMissing };
  }

  const totalQuestions = sectionAssignments.reduce((sum, s) => sum + s.questions.length, 0);
  const totalMarks = sectionAssignments.reduce((sum, s) => sum + s.questions.length * s.marks, 0);

  const paper = await Paper.create({
    examId,
    blueprintId,
    blueprintSnapshot: blueprint.toObject(),
    generationMode: mode,
    status: 'DRAFT',
    totalMarks,
    totalQuestions,
    createdBy: adminId,
  });

  let orderIndex = 0;
  const examQuestionDocs = [];
  for (const section of sectionAssignments) {
    for (const question of section.questions) {
      const latestVersion = await QuestionVersion.findOne({
        questionId: question._id,
        versionNumber: question.currentVersionNumber,
      });
      examQuestionDocs.push({
        paperId: paper._id,
        examId,
        questionId: question._id,
        questionVersionId: latestVersion._id,
        sectionName: section.sectionName,
        orderIndex: orderIndex++,
        marks: section.marks,
        optionOrder: ['A', 'B', 'C', 'D'],
      });
    }
  }
  await ExamQuestion.insertMany(examQuestionDocs);

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'PAPER_GENERATED',
    entityType: 'Paper',
    entityId: paper._id,
    metadata: { examId, mode, totalQuestions, totalMarks },
  });

  return { success: true, paper };
}

async function editPaper(paperId, changes, adminId) {
  const paper = await Paper.findById(paperId);
  if (!paper) throw new ApiError('Paper not found', 404, 'NOT_FOUND');
  if (paper.status === 'LOCKED') {
    throw new ApiError('This paper is locked and cannot be edited', 400, 'PAPER_LOCKED');
  }

  const { addQuestionIds = [], removeExamQuestionIds = [], reorder = [] } = changes;

  if (removeExamQuestionIds.length) {
    await ExamQuestion.deleteMany({ _id: { $in: removeExamQuestionIds }, paperId });
  }

  if (addQuestionIds.length) {
    let maxOrder = await ExamQuestion.countDocuments({ paperId });
    for (const questionId of addQuestionIds) {
      const question = await Question.findById(questionId);
      if (!question || question.status !== 'APPROVED') continue;
      const latestVersion = await QuestionVersion.findOne({ questionId, versionNumber: question.currentVersionNumber });
      await ExamQuestion.create({
        paperId,
        examId: paper.examId,
        questionId,
        questionVersionId: latestVersion._id,
        sectionName: changes.targetSectionName || 'Section A',
        orderIndex: maxOrder++,
        marks: changes.marksPerQuestion || 1,
      });
    }
  }

  if (reorder.length) {
    for (const { examQuestionId, orderIndex } of reorder) {
      await ExamQuestion.updateOne({ _id: examQuestionId, paperId }, { orderIndex });
    }
  }

  const examQuestions = await ExamQuestion.find({ paperId });
  paper.totalQuestions = examQuestions.length;
  paper.totalMarks = examQuestions.reduce((sum, q) => sum + q.marks, 0);
  paper.status = 'IN_REVIEW';
  await paper.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'PAPER_EDITED',
    entityType: 'Paper',
    entityId: paper._id,
    metadata: changes,
  });

  return paper;
}

async function analyzePaper(paperId) {
  const paper = await Paper.findById(paperId);
  if (!paper) throw new ApiError('Paper not found', 404, 'NOT_FOUND');

  const examQuestions = await ExamQuestion.find({ paperId }).populate('questionId');

  const sectionDistribution = {};
  const unitDistribution = {};
  const topicDistribution = {};
  const difficultyDistribution = {};
  const questionTypeDistribution = {};
  const seenQuestionIds = new Set();
  const duplicates = [];
  const previouslyUsed = [];

  for (const eq of examQuestions) {
    const q = eq.questionId;
    sectionDistribution[eq.sectionName] = (sectionDistribution[eq.sectionName] || 0) + 1;
    if (q?.unit) unitDistribution[q.unit] = (unitDistribution[q.unit] || 0) + 1;
    if (q?.topic) topicDistribution[q.topic] = (topicDistribution[q.topic] || 0) + 1;
    if (q?.difficulty) difficultyDistribution[q.difficulty] = (difficultyDistribution[q.difficulty] || 0) + 1;
    if (q?.questionType) questionTypeDistribution[q.questionType] = (questionTypeDistribution[q.questionType] || 0) + 1;

    const idStr = q?._id?.toString();
    if (idStr) {
      if (seenQuestionIds.has(idStr)) duplicates.push(idStr);
      seenQuestionIds.add(idStr);
      if (q.useCount > 0) previouslyUsed.push(idStr);
    }
  }

  return {
    totalQuestions: paper.totalQuestions,
    totalMarks: paper.totalMarks,
    sectionDistribution,
    unitDistribution,
    topicDistribution,
    difficultyDistribution,
    questionTypeDistribution,
    duplicateQuestionIds: [...new Set(duplicates)],
    previouslyUsedQuestionIds: previouslyUsed,
  };
}

/**
 * Irreversible (outside an explicit, separately audited change-workflow not
 * built here). Freezes question order/marks/versions and flips every
 * included Question to USED_IN_EXAMINATION.
 */
async function lockPaper(paperId, adminId) {
  const session = await mongoose.startSession();
  try {
    let paper;
    await session.withTransaction(async () => {
      paper = await Paper.findById(paperId).session(session);
      if (!paper) throw new ApiError('Paper not found', 404, 'NOT_FOUND');
      if (paper.status === 'LOCKED') throw new ApiError('Paper is already locked', 400, 'ALREADY_LOCKED');

      const examQuestions = await ExamQuestion.find({ paperId }).session(session);
      if (!examQuestions.length) throw new ApiError('Cannot lock a paper with no questions', 400, 'EMPTY_PAPER');

      paper.status = 'LOCKED';
      paper.lockedAt = new Date();
      paper.lockedBy = adminId;
      await paper.save({ session });

      const questionIds = examQuestions.map((eq) => eq.questionId);
      await Question.updateMany(
        { _id: { $in: questionIds } },
        { status: 'USED_IN_EXAMINATION', $inc: { useCount: 1 }, lastUsedAt: new Date() },
        { session }
      );

      await Exam.findByIdAndUpdate(paper.examId, { lockedPaperId: paper._id }, { session });
    });

    await auditService.record({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'PAPER_LOCKED',
      entityType: 'Paper',
      entityId: paper._id,
      metadata: { examId: paper.examId },
    });

    return paper;
  } finally {
    session.endSession();
  }
}

module.exports = { generatePaper, editPaper, analyzePaper, lockPaper };
