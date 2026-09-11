const express = require('express');
const Attempt = require('../../models/Attempt');
const Question = require('../../models/Question');
const { requireAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { isValidObjectId } = require('../../utils/validators');

const router = express.Router();
router.use(requireAdmin);

/** GET /api/admin/results - filterable live results table. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { round, department, status, minScore, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (round) filter.roundNumber = Number(round);
    if (department && isValidObjectId(department)) filter.department = department;
    if (status) filter.status = status;
    if (minScore) filter.score = { $gte: Number(minScore) };
    if (from || to) {
      filter.submittedAt = {};
      if (from) filter.submittedAt.$gte = new Date(from);
      if (to) filter.submittedAt.$lte = new Date(to);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    const [items, total] = await Promise.all([
      Attempt.find(filter)
        .populate('student', 'name rollNumber')
        .populate('department', 'name')
        .sort({ submittedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Attempt.countDocuments(filter)
    ]);

    const rows = items.map((a) => ({
      attemptId: a._id,
      student: a.student?.name,
      rollNumber: a.student?.rollNumber,
      department: a.department?.name,
      round: a.roundNumber,
      status: a.status,
      score: a.score,
      correct: a.correctAnswers,
      wrong: a.wrongAnswers,
      unanswered: a.unanswered,
      violationCount: a.violationCount || 0,
      violationReason: a.violationReason,
      timeTakenSeconds: a.timeTakenSeconds,
      submittedAt: a.submittedAt
    }));

    res.json({ items: rows, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  })
);

/** GET /api/admin/results/:attemptId - full question-by-question detail for one student. */
router.get(
  '/:attemptId',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.attemptId)) return res.status(400).json({ error: 'Invalid attempt id' });

    const attempt = await Attempt.findById(req.params.attemptId)
      .populate('student', 'name rollNumber')
      .populate('department', 'name')
      .lean();
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const questionIds = attempt.questions.map((q) => q.question);
    const questions = await Question.find({ _id: { $in: questionIds } }).lean();
    const qMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const detail = attempt.questions
      .sort((a, b) => a.order - b.order)
      .map((aq) => {
        const master = qMap.get(aq.question.toString());
        const selectedKey = aq.selectedPosition !== null && aq.selectedPosition !== undefined ? aq.optionOrder[aq.selectedPosition] : null;
        return {
          order: aq.order,
          questionText: master?.questionText,
          options: master?.options,
          selectedAnswer: selectedKey,
          correctAnswer: master?.correctAnswer,
          isCorrect: aq.isCorrect,
          marks: aq.marks,
          flagged: aq.flagged === true
        };
      });

    res.json({
      student: attempt.student,
      department: attempt.department?.name,
      roundNumber: attempt.roundNumber,
      status: attempt.status,
      violationCount: attempt.violationCount || 0,
      violationReason: attempt.violationReason,
      violationAt: attempt.violationAt,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timeTakenSeconds: attempt.timeTakenSeconds,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      questions: detail
    });
  })
);

module.exports = router;
