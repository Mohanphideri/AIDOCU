const mongoose = require('mongoose');
const { Schema } = mongoose;

const PAPER_STATUSES = ['DRAFT', 'IN_REVIEW', 'LOCKED'];
const GENERATION_MODES = ['AUTOMATIC', 'MANUAL', 'HYBRID'];

const PaperSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    blueprintId: { type: Schema.Types.ObjectId, ref: 'ExamBlueprint', required: true },
    // Snapshot of the blueprint at generation time, frozen once locked.
    blueprintSnapshot: { type: Schema.Types.Mixed, required: true },

    generationMode: { type: String, enum: GENERATION_MODES, required: true },
    status: { type: String, enum: PAPER_STATUSES, default: 'DRAFT', index: true },

    totalMarks: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },

    lockedAt: { type: Date, default: null },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true }
);

PaperSchema.statics.PAPER_STATUSES = PAPER_STATUSES;
PaperSchema.statics.GENERATION_MODES = GENERATION_MODES;

module.exports = mongoose.model('Paper', PaperSchema);
