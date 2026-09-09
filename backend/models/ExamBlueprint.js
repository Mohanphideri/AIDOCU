const mongoose = require('mongoose');
const { Schema } = mongoose;

const SectionSchema = new Schema(
  {
    name: { type: String, required: true }, // e.g. "Section A"
    questionCount: { type: Number, required: true, min: 1 },
    marksPerQuestion: { type: Number, required: true, min: 0 },
    questionType: { type: String, default: 'MCQ' },
    unitDistribution: [{ unit: String, percentage: Number }],
    topicDistribution: [{ topic: String, percentage: Number }],
    difficultyDistribution: [{ difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'] }, percentage: Number }],
    recentReuseRestrictionDays: { type: Number, default: 0 },
  },
  { _id: false }
);

const ExamBlueprintSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, unique: true, index: true },
    sections: { type: [SectionSchema], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true }
);

ExamBlueprintSchema.virtual('totalQuestions').get(function totalQuestions() {
  return this.sections.reduce((sum, s) => sum + s.questionCount, 0);
});

ExamBlueprintSchema.virtual('totalMarks').get(function totalMarks() {
  return this.sections.reduce((sum, s) => sum + s.questionCount * s.marksPerQuestion, 0);
});

module.exports = mongoose.model('ExamBlueprint', ExamBlueprintSchema);
