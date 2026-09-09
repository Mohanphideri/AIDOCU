const mongoose = require('mongoose');
const { Schema } = mongoose;

// Faculty here = "Faculty/School" academic unit (e.g. "Faculty of Science"),
// distinct from FacultyMember (a person who teaches).
const FacultySchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FacultySchema.index({ universityId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Faculty', FacultySchema);
