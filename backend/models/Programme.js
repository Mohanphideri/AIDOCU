const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProgrammeSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    name: { type: String, required: true, trim: true }, // e.g. "B.Tech Computer Science"
    code: { type: String, required: true, trim: true, uppercase: true },
    durationSemesters: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProgrammeSchema.index({ departmentId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Programme', ProgrammeSchema);
