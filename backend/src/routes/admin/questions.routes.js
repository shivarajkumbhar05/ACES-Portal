const express = require('express');
const Question = require('../../models/Question');
const { requireAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { isValidObjectId, isOptionKey, isNonEmptyString, escapeRegex } = require('../../utils/validators');
const { DIFFICULTIES } = require('../../config/constants');

const router = express.Router();
router.use(requireAdmin);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { round, search, category, difficulty, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (round && isValidObjectId(round)) filter.round = round;
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (typeof search === 'string' && search.trim()) {
      filter.questionText = { $regex: escapeRegex(search.trim().slice(0, 100)), $options: 'i' };
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const [items, total] = await Promise.all([
      Question.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Question.countDocuments(filter)
    ]);

    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  })
);

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await Question.distinct('category', req.query.round ? { round: req.query.round } : {});
    res.json(categories);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid question id' });
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  })
);

function validateQuestionBody(body) {
  const errors = [];
  if (!isValidObjectId(body.round)) errors.push('A valid round is required');
  if (!isNonEmptyString(body.questionText, 1000)) errors.push('Question text is required');
  const opts = body.options || {};
  ['A', 'B', 'C', 'D'].forEach((k) => {
    if (!isNonEmptyString(opts[k], 300)) errors.push(`Option ${k} is required`);
  });
  if (!isOptionKey(body.correctAnswer)) errors.push('Correct answer must be A, B, C or D');
  if (body.difficulty && !DIFFICULTIES.includes(body.difficulty)) errors.push('Invalid difficulty');
  if (body.marks !== undefined && (Number.isNaN(Number(body.marks)) || Number(body.marks) <= 0)) {
    errors.push('Marks must be a positive number');
  }
  return errors;
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const errors = validateQuestionBody(req.body);
    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

    const { round, questionText, options, correctAnswer, category, difficulty, marks } = req.body;

    const normalizedText = questionText.trim().toLowerCase().replace(/\s+/g, ' ');
    const duplicate = await Question.findOne({ round, normalizedText });
    if (duplicate) {
      return res.status(409).json({ error: 'A very similar question already exists in this round' });
    }

    const question = await Question.create({
      round,
      questionText: questionText.trim(),
      options,
      correctAnswer,
      category: category || 'General',
      difficulty: difficulty || 'Medium',
      marks: marks || 1
    });

    res.status(201).json(question);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid question id' });
    const errors = validateQuestionBody({ ...req.body, round: req.body.round || 'placeholder' });
    // round is not editable via update; skip its validation error if omitted
    const filteredErrors = errors.filter((e) => e !== 'A valid round is required');
    if (filteredErrors.length) return res.status(400).json({ error: 'Validation failed', details: filteredErrors });

    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const { questionText, options, correctAnswer, category, difficulty, marks, isActive } = req.body;
    question.questionText = questionText.trim();
    question.options = options;
    question.correctAnswer = correctAnswer;
    question.category = category || 'General';
    question.difficulty = difficulty || 'Medium';
    question.marks = marks || 1;
    if (typeof isActive === 'boolean') question.isActive = isActive;

    await question.save();
    res.json(question);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid question id' });
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json({ ok: true });
  })
);

module.exports = router;
