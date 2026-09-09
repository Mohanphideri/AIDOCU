const mongoose = require('mongoose');
const { Schema } = mongoose;

const SemesterSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    programmeId: { type: Schema.Types.ObjectId, ref: 'Programme', required: true, index: true },
    number: { type: Number, required: true, min: 1 }, // 1,2,3...
    academicSessionId: { type: Schema.Types.ObjectId, ref: 'AcademicSession', required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SemesterSchema.index({ programmeId: 1, number: 1, academicSessionId: 1 }, { unique: true });

module.exports = mongoose.model('Semester', SemesterSchema);
