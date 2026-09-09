const mongoose = require('mongoose');
const { Schema } = mongoose;

const ACCOUNT_STATUSES = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DISABLED'];

const StudentSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    name: { type: String, required: true, trim: true },
    uid: { type: String, required: true, trim: true, uppercase: true },
    universityEmail: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },

    emailVerified: { type: Boolean, default: false },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: 'PENDING_VERIFICATION',
    },

    programmeId: { type: Schema.Types.ObjectId, ref: 'Programme', default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', default: null },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// UID and university email must be unique per university.
StudentSchema.index({ universityId: 1, uid: 1 }, { unique: true });
StudentSchema.index({ universityId: 1, universityEmail: 1 }, { unique: true });

// Login is only permitted when emailVerified === true AND accountStatus === 'ACTIVE'.
StudentSchema.methods.canLogin = function canLogin() {
  return this.emailVerified === true && this.accountStatus === 'ACTIVE';
};

StudentSchema.statics.ACCOUNT_STATUSES = ACCOUNT_STATUSES;

module.exports = mongoose.model('Student', StudentSchema);
