const { verifyAdminToken, verifyStudentToken } = require('../utils/jwt');
const Admin = require('../models/Admin');
const Attempt = require('../models/Attempt');
const { ADMIN_ROLES } = require('../config/constants');

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/** Requires a valid admin JWT. Attaches req.admin. */
async function requireAdmin(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Missing or invalid Authorization header' });

    const payload = verifyAdminToken(token);
    if (payload.type !== 'admin') return res.status(401).json({ error: 'Invalid token type' });

    const admin = await Admin.findById(payload.sub);
    if (!admin || !admin.isActive) return res.status(401).json({ error: 'Admin account not found or disabled' });

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

/** Restricts a route to super_admin only. Use after requireAdmin. */
function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== ADMIN_ROLES.SUPER_ADMIN) {
    return res.status(403).json({ error: 'Super admin privileges required' });
  }
  next();
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'This staff role is not allowed to access this resource' });
    }
    next();
  };
}

/**
 * Requires a valid student (attempt-scoped) JWT. Attaches req.attemptId and
 * req.studentId, and loads the live attempt document onto req.attempt so
 * downstream handlers never trust the token contents alone for status checks.
 */
async function requireStudentAttempt(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Missing or invalid Authorization header' });

    const payload = verifyStudentToken(token);
    if (payload.type !== 'student') return res.status(401).json({ error: 'Invalid token type' });

    const attempt = await Attempt.findById(payload.attemptId);
    if (!attempt || attempt.student.toString() !== payload.sub) {
      return res.status(401).json({ error: 'Attempt session not found' });
    }

    req.attempt = attempt;
    req.studentId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired quiz session token' });
  }
}

module.exports = { requireAdmin, requireSuperAdmin, requireRoles, requireStudentAttempt };
