const { Schema, model } = require('mongoose');

const auditLogSchema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String }
  },
  { timestamps: true }
);

module.exports = model('AuditLog', auditLogSchema);
