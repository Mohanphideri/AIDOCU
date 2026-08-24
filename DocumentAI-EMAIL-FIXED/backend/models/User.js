const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null, unique: true, sparse: true, index: true },
    avatarUrl: { type: String, default: null },
    emailVerified: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
    settings: { type: Schema.Types.Mixed, default: {} },
    tokenVersion: { type: Number, default: 0 }, // bump to invalidate all existing JWTs ("logout all sessions")
    passwordResetTokenHash: { type: String, default: null, index: true },
    passwordResetExpiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    emailVerified: this.emailVerified,
    avatarUrl: this.avatarUrl,
    theme: this.theme,
    settings: this.settings || {},
    createdAt: this.createdAt,
  };
};

module.exports = model('User', userSchema);
