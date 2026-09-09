const mongoose = require('mongoose');
const { Schema } = mongoose;

const SupervisorSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    permissions: {
      type: [String],
      default: [], // e.g. ['VIEW_LIVE', 'FLAG_CANDIDATE', 'TERMINATE_ATTEMPT']
    },
    assignedExamIds: [{ type: Schema.Types.ObjectId, ref: 'Exam' }],
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supervisor', SupervisorSchema);
