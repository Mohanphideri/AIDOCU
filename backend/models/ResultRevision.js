const mongoose = require('mongoose');
const { Schema } = mongoose;

// Every correction to a Result creates one of these. Historical corrections
// are never overwritten.
const ResultRevisionSchema = new Schema(
  {
    resultId: { type: Schema.Types.ObjectId, ref: 'Result', required: true, index: true },
    oldValue: { type: Schema.Types.Mixed, required: true },
    newValue: { type: Schema.Types.Mixed, required: true },
    reason: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ResultRevision', ResultRevisionSchema);
