const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const { signAdminToken } = require('../utils/jwt');
const { loginLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/auth');
const { isNonEmptyString } = require('../utils/validators');

const router = express.Router();

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.trim().toLowerCase() });

    // Constant-shape response whether or not the account exists, to avoid
    // leaking which usernames are valid.
    const passwordHash = admin ? admin.passwordHash : '$2a$10$invalidsaltinvalidsaltinvalidsal.invalidhashinvalidhashinvalid';
    const passwordOk = await bcrypt.compare(password, passwordHash);

    if (!admin || !passwordOk || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    await AuditLog.create({
      admin: admin._id,
      action: 'admin.login',
      ipAddress: req.ip
    });

    const token = signAdminToken(admin);
    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });
  })
);

router.get(
  '/me',
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json({
      id: req.admin._id,
      username: req.admin.username,
      name: req.admin.name,
      role: req.admin.role
    });
  })
);

router.post(
  '/password',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword) || newPassword.length < 8) {
      return res.status(400).json({ error: 'Current password and a new password of at least 8 characters are required' });
    }
    const matches = await bcrypt.compare(currentPassword, req.admin.passwordHash);
    if (!matches) return res.status(400).json({ error: 'Current password is incorrect' });
    req.admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await req.admin.save();
    await AuditLog.create({ admin: req.admin._id, action: 'admin.password_change', ipAddress: req.ip });
    res.json({ message: 'Password changed successfully' });
  })
);

module.exports = router;
