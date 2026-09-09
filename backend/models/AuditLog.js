const mongoose = require('mongoose');
const { Schema } = mongoose;

// Immutable by convention: application code must only ever insert, never
// update or delete, records in this collection. Never log passwords,
// verification codes, reset tokens, or other secrets in metadata/before/after.
const AuditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorRole: { type: String, enum: ['ADMIN', 'FACULTY', 'SUPERVISOR', 'STUDENT', 'SYSTEM'], required: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
    beforeValue: { type: Schema.Types.Mixed, default: null },
    afterValue: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
  },
  { timestamps: true }
);

AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
