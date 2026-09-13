const rateLimit = require('express-rate-limit');

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

const examEntryLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const roll = normalizeText(req.body?.rollNumber);
    const department = req.body?.departmentId || 'unknown';
    const examCode = normalizeText(req.body?.examCode);
    const round = String(req.body?.roundNumber || 1);
    return `verify:${roll}:${department}:${examCode}:${round}`;
  },
  message: { error: 'Too many attempts to start the quiz. Please wait a few minutes and try again.' }
});

const answerSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1800,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization || req.ip || 'anon';
    return `answer:${auth}`;
  },
  message: { error: 'Too many requests. Slow down.' }
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload attempts. Please try again later.' }
});

module.exports = { loginLimiter, examEntryLimiter, answerSubmitLimiter, uploadLimiter };
