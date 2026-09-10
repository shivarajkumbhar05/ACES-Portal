const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const Question = require('../../models/Question');
const QuizRound = require('../../models/QuizRound');
const { requireAdmin } = require('../../middleware/auth');
const { uploadLimiter } = require('../../middleware/rateLimit');
const { asyncHandler } = require('../../middleware/errorHandler');
const { parseQuestionFile, buildTemplateCSV } = require('../../utils/questionFileParser');
const { isValidObjectId } = require('../../utils/validators');

const router = express.Router();
router.use(requireAdmin);

const ALLOWED_MIME = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_SIZE_MB) || 5) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const nameOk = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    if (!nameOk || !ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Only .csv or .xlsx files are allowed'));
    }
    cb(null, true);
  }
});

// In-memory holding area for validated-but-not-yet-imported batches.
// Keyed by a short-lived batch token so a confirm step can't be replayed
// against a different (possibly since-modified) file.
const pendingBatches = new Map();
const BATCH_TTL_MS = 15 * 60 * 1000;

function stashBatch(rows, roundId, adminId) {
  const token = crypto.randomBytes(16).toString('hex');
  pendingBatches.set(token, { rows, roundId, adminId: adminId.toString(), expiresAt: Date.now() + BATCH_TTL_MS });
  return token;
}

function getBatch(token, adminId) {
  const batch = pendingBatches.get(token);
  if (!batch) return null;
  if (Date.now() > batch.expiresAt) {
    pendingBatches.delete(token);
    return null;
  }
  if (batch.adminId !== adminId.toString()) return null;
  return batch;
}

router.get('/template', (req, res) => {
  const csv = buildTemplateCSV();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="question_upload_template.csv"');
  res.send(csv);
});

/**
 * Step 1: upload + validate. Nothing is written to the database here.
 * Returns counts of valid/invalid rows and a preview, plus a batchToken
 * that must be presented to /confirm to actually import.
 */
router.post(
  '/validate',
  uploadLimiter,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { roundId } = req.body;
    if (!isValidObjectId(roundId)) return res.status(400).json({ error: 'A valid round must be selected' });

    const round = await QuizRound.findById(roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });

    const report = parseQuestionFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!report.fileValid) {
      return res.status(400).json({ error: report.error });
    }

    // Detect duplicates against questions already stored for this round.
    const existing = await Question.find({ round: roundId }).select('normalizedText').lean();
    const existingSet = new Set(existing.map((q) => q.normalizedText));

    const finalValid = [];
    const finalInvalid = [...report.invalidRows];

    report.validRows.forEach((row) => {
      if (existingSet.has(row.normalizedText)) {
        finalInvalid.push({ rowNumber: row.rowNumber, reasons: ['Duplicate of a question already in the bank'], raw: row });
      } else {
        finalValid.push(row);
      }
    });

    const batchToken = stashBatch(finalValid, roundId, req.admin._id);

    res.json({
      batchToken,
      totalRows: report.totalRows,
      validCount: finalValid.length,
      invalidCount: finalInvalid.length,
      preview: finalValid.slice(0, 10),
      invalidRows: finalInvalid.slice(0, 50)
    });
  })
);

/** Step 2: admin explicitly confirms the import of the previously validated batch. */
router.post(
  '/confirm',
  uploadLimiter,
  asyncHandler(async (req, res) => {
    const { batchToken } = req.body;
    if (typeof batchToken !== 'string' || !/^[a-f0-9]{32}$/.test(batchToken)) {
      return res.status(400).json({ error: 'Invalid upload batch token' });
    }
    const batch = getBatch(batchToken, req.admin._id);
    if (!batch) return res.status(400).json({ error: 'This upload batch has expired or was not found. Please re-upload.' });

    if (!batch.rows.length) {
      pendingBatches.delete(batchToken);
      return res.status(400).json({ error: 'No valid questions to import in this batch' });
    }

    const docs = batch.rows.map((row) => ({
      round: batch.roundId,
      questionText: row.questionText,
      options: row.options,
      correctAnswer: row.correctAnswer,
      category: row.category,
      difficulty: row.difficulty,
      marks: row.marks,
      normalizedText: row.normalizedText
    }));

    const inserted = await Question.insertMany(docs, { ordered: false });
    pendingBatches.delete(batchToken);

    res.status(201).json({ imported: inserted.length });
  })
);

module.exports = router;
