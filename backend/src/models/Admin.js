const { Schema, model } = require('mongoose');
const { ADMIN_ROLES } = require('../config/constants');

const notificationSchema = new Schema(
  {
    message: { type: String, required: true, trim: true, maxlength: 280 },
    sentBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    createdAt: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
  },
  { _id: true }
);

const timeClockSchema = new Schema(
  {
    state: { type: String, enum: ['in', 'out'], default: 'out' },
    clockedInAt: { type: Date, default: null },
    clockedOutAt: { type: Date, default: null }
  },
  { _id: false }
);

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
    lastLoginAt: { type: Date },
    notifications: { type: [notificationSchema], default: [] },
    timeClock: { type: timeClockSchema, default: { state: 'out', clockedInAt: null, clockedOutAt: null } }
  },
  { timestamps: true }
);

module.exports = model('Admin', adminSchema);
