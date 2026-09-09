const mongoose = require('mongoose');
const { Schema } = mongoose;

// CRITICAL: This is NOT a global student list. Registration (Student model)
// and exam eligibility (this model) are deliberately separate concepts.
// A row here must reference an EXISTING Student — eligibility import never
// creates accounts.
const ExamEligibilitySchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    uid: { type: String, required: true, trim: true, uppercase: true, index: true },

    importedAt: { type: Date, default: Date.now },
    importedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    sourceFileName: { type: String, default: null },
    addedManually: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ExamEligibilitySchema.index({ examId: 1, studentId: 1 }, { unique: true });
ExamEligibilitySchema.index({ examId: 1, uid: 1 });

module.exports = mongoose.model('ExamEligibility', ExamEligibilitySchema);
