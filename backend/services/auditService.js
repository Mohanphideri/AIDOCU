const { AuditLog } = require('../models');

const SENSITIVE_KEYS = ['password', 'passwordHash', 'code', 'codeHash', 'token', 'tokenHash', 'secret', 'apiKey'];

// Defense-in-depth: strip anything that looks like a secret before writing
// audit metadata, even if a caller forgets to scrub it first.
function scrub(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(scrub);
  if (typeof value === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        clean[key] = '[REDACTED]';
      } else {
        clean[key] = scrub(val);
      }
    }
    return clean;
  }
  return value;
}

async function record({
  actorId,
  actorRole,
  action,
  entityType,
  entityId,
  metadata = {},
  beforeValue = null,
  afterValue = null,
  ipAddress = null,
}) {
  return AuditLog.create({
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    metadata: scrub(metadata),
    beforeValue: scrub(beforeValue),
    afterValue: scrub(afterValue),
    ipAddress,
    timestamp: new Date(),
  });
}

async function search({ entityType, entityId, actorId, action, from, to, page = 1, limit = 50 }) {
  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (actorId) filter.actorId = actorId;
  if (action) filter.action = action;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

module.exports = { record, search };
