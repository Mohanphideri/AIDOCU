const mongoose = require('mongoose');
const { Schema } = mongoose;

const AdminSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['SUPER_ADMIN', 'ADMIN'], default: 'ADMIN' },
    permissions: {
      type: [String],
      default: [], // e.g. ['PUBLISH_RESULTS', 'MANAGE_ELIGIBILITY', ...]
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', AdminSchema);
