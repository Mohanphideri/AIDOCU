const mongoose = require('mongoose');
const { Schema } = mongoose;

// Links a Paper to the exact QuestionVersion used, with fixed order/marks/section.
// Once the Paper is LOCKED, these records must not change.
const ExamQuestionSchema = new Schema(
  {
    paperId: { type: Schema.Types.ObjectId, ref: 'Paper', required: true, index: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    questionVersionId: { type: Schema.Types.ObjectId, ref: 'QuestionVersion', required: true },

    sectionName: { type: String, required: true },
    orderIndex: { type: Number, required: true },
    marks: { type: Number, required: true },

    // Fixed option order shown to students, if randomization is used.
    // e.g. ['C','A','D','B'] means option C is displayed first.
    optionOrder: { type: [String], default: ['A', 'B', 'C', 'D'] },
  },
  { timestamps: true }
);

ExamQuestionSchema.index({ paperId: 1, orderIndex: 1 }, { unique: true });

module.exports = mongoose.model('ExamQuestion', ExamQuestionSchema);
