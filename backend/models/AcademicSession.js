const mongoose = require('mongoose');
const { Schema } = mongoose;

const AcademicSessionSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    name: { type: String, required: true, trim: true }, // e.g. "2025-2026"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AcademicSessionSchema.index({ universityId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicSession', AcademicSessionSchema);
