const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubjectSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    programmeId: { type: Schema.Types.ObjectId, ref: 'Programme', required: true, index: true },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SubjectSchema.index({ programmeId: 1, semesterId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema);
