const { Schema, model } = require('mongoose');
const { ADMIN_ROLES } = require('../config/constants');

const adminSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(ADMIN_ROLES),
      default: ADMIN_ROLES.ADMIN
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = model('Admin', adminSchema);
