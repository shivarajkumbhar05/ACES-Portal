const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { requireAdmin, requireRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { ADMIN_ROLES } = require('../config/constants');
const { isNonEmptyString } = require('../utils/validators');

const router = express.Router();
router.use(requireAdmin, requireRoles(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN));

router.get('/', asyncHandler(async (req, res) => {
  const staff = await Admin.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
  res.json(staff);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { username, name, password, role } = req.body;
  if (!isNonEmptyString(username) || !isNonEmptyString(name) || !isNonEmptyString(password) || password.length < 8) {
    return res.status(400).json({ error: 'Name, username, and a password of at least 8 characters are required' });
  }
  if (![ADMIN_ROLES.ADMIN, ADMIN_ROLES.JUDGE, ADMIN_ROLES.VOLUNTEER].includes(role)) {
    return res.status(400).json({ error: 'Staff role must be admin, judge, or volunteer' });
  }
  const exists = await Admin.exists({ username: username.trim().toLowerCase() });
  if (exists) return res.status(409).json({ error: 'That username is already in use' });
  const staff = await Admin.create({
    username: username.trim().toLowerCase(),
    name: name.trim(),
    role,
    passwordHash: await bcrypt.hash(password, 12)
  });
  res.status(201).json({ id: staff._id, username: staff.username, name: staff.name, role: staff.role, isActive: staff.isActive });
}));

router.get('/notifications', asyncHandler(async (req, res) => {
  const staff = await Admin.find().select('name username role notifications timeClock').sort({ createdAt: -1 }).lean();
  res.json(staff);
}));

router.post('/notifications', asyncHandler(async (req, res) => {
  const { message, role } = req.body;
  if (!isNonEmptyString(message, 280)) return res.status(400).json({ error: 'Notification message is required' });
  const roleFilter = role && [ADMIN_ROLES.JUDGE, ADMIN_ROLES.VOLUNTEER, ADMIN_ROLES.ADMIN].includes(role) ? role : null;
  const query = roleFilter ? { role: roleFilter } : { role: { $in: [ADMIN_ROLES.JUDGE, ADMIN_ROLES.VOLUNTEER, ADMIN_ROLES.ADMIN] } };
  const staff = await Admin.find(query).select('_id');
  const payload = { message: message.trim(), sentBy: req.admin._id, createdAt: new Date(), isRead: false };
  await Admin.updateMany(query, { $push: { notifications: payload } });
  await Admin.findById(req.admin._id).select('_id').lean();
  res.json({ ok: true, sentTo: staff.length, message });
}));

router.post('/:id/time-clock', asyncHandler(async (req, res) => {
  const staff = await Admin.findById(req.params.id);
  if (!staff) return res.status(404).json({ error: 'Staff account not found' });
  const now = new Date();
  if (staff.timeClock?.state === 'in') {
    staff.timeClock.state = 'out';
    staff.timeClock.clockedOutAt = now;
  } else {
    staff.timeClock.state = 'in';
    staff.timeClock.clockedInAt = now;
    staff.timeClock.clockedOutAt = null;
  }
  await staff.save();
  res.json(staff.toObject({ getters: true }));
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const staff = await Admin.findByIdAndUpdate(req.params.id, { isActive: Boolean(req.body.isActive) }, { new: true }).select('-passwordHash');
  if (!staff) return res.status(404).json({ error: 'Staff account not found' });
  res.json(staff);
}));

module.exports = router;
