const mongoose = require('mongoose');
const { Schema } = mongoose;

const UniversitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String, default: null },
    address: { type: String, default: null },
    officialEmail: { type: String, required: true, trim: true, lowercase: true },
    contactNumber: { type: String, default: null },
    // Configurable email domain used to validate student registration emails.
    // e.g. "university.edu" -> student@university.edu is valid.
    emailDomain: { type: String, required: true, trim: true, lowercase: true },
    supportedLanguages: {
      type: [String],
      default: ['en'],
      validate: {
        validator: (arr) => arr.every((l) => ['en', 'hi', 'pa', 'ta'].includes(l)),
        message: 'Unsupported language code',
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('University', UniversitySchema);
