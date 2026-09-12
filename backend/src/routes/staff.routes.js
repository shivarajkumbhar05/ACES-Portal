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

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const staff = await Admin.findByIdAndUpdate(req.params.id, { isActive: Boolean(req.body.isActive) }, { new: true }).select('-passwordHash');
  if (!staff) return res.status(404).json({ error: 'Staff account not found' });
  res.json(staff);
}));

module.exports = router;
