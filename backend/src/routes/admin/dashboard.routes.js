const express = require('express');
const Attempt = require('../../models/Attempt');
const Question = require('../../models/Question');
const QuizRound = require('../../models/QuizRound');
const Student = require('../../models/Student');
const { requireAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { ATTEMPT_STATUS } = require('../../config/constants');

const router = express.Router();
router.use(requireAdmin);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const roundNumber = Number(req.query.round) || 1;
    const round = await QuizRound.findOne({ roundNumber });

    const totalParticipants = await Attempt.countDocuments({ roundNumber });
    const completed = await Attempt.countDocuments({ roundNumber, status: ATTEMPT_STATUS.COMPLETED });
    const inProgress = await Attempt.countDocuments({ roundNumber, status: ATTEMPT_STATUS.IN_PROGRESS });

    const questionBankSize = round ? await Question.countDocuments({ round: round._id }) : 0;

    const scoreAgg = await Attempt.aggregate([
      { $match: { roundNumber, status: ATTEMPT_STATUS.COMPLETED } },
      { $group: { _id: null, topScore: { $max: '$score' }, avgScore: { $avg: '$score' }, maxScore: { $max: '$maxScore' } } }
    ]);

    const notStarted = Math.max(0, (await Student.estimatedDocumentCount()) - totalParticipants);

    res.json({
      roundNumber,
      totalParticipants,
      completed,
      inProgress,
      notStarted,
      totalQuestions: round ? round.questionsPerQuiz : 0,
      questionBankSize,
      topScore: scoreAgg[0]?.topScore ?? 0,
      maxPossibleScore: scoreAgg[0]?.maxScore ?? 0,
      averageScore: scoreAgg[0] ? Math.round(scoreAgg[0].avgScore * 100) / 100 : 0
    });
  })
);

router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const roundNumber = Number(req.query.round) || 1;
    const departmentId = req.query.department;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const filter = { roundNumber, status: ATTEMPT_STATUS.COMPLETED };
    if (departmentId) filter.department = departmentId;

    const attempts = await Attempt.find(filter)
      .populate('student', 'name rollNumber')
      .populate('department', 'name')
      .sort({ score: -1, timeTakenSeconds: 1, submittedAt: 1 })
      .limit(limit)
      .lean();

    const leaderboard = attempts.map((a, i) => ({
      rank: i + 1,
      studentName: a.student.name,
      rollNumber: a.student.rollNumber,
      department: a.department.name,
      score: a.score,
      maxScore: a.maxScore,
      correct: a.correctAnswers,
      wrong: a.wrongAnswers,
      timeTakenSeconds: a.timeTakenSeconds,
      submittedAt: a.submittedAt
    }));

    res.json(leaderboard);
  })
);

module.exports = router;
