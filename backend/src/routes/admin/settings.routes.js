const express = require('express');
const QuizRound = require('../../models/QuizRound');
const Attempt = require('../../models/Attempt');
const AuditLog = require('../../models/AuditLog');
const { requireAdmin, requireSuperAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { isNonEmptyString } = require('../../utils/validators');
const { ROUND_STATUS, ROUND_TYPES } = require('../../config/constants');
const { finalizeAttemptScore } = require('../../services/scoring.service');

const router = express.Router();
router.use(requireAdmin);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rounds = await QuizRound.find().sort({ roundNumber: 1 });
    res.json(rounds.map((r) => r.toSafeJSON()));
  })
);

router.get(
  '/:roundNumber',
  asyncHandler(async (req, res) => {
    const round = await QuizRound.findOne({ roundNumber: Number(req.params.roundNumber) });
    if (!round) return res.status(404).json({ error: 'Round not found' });
    res.json(round.toSafeJSON());
  })
);

/** Create or update settings for a round. Exam code is optional on update (only rehashed if provided). */
router.put(
  '/:roundNumber',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const roundNumber = Number(req.params.roundNumber);
    if (![1, 2].includes(roundNumber)) return res.status(400).json({ error: 'roundNumber must be 1 or 2' });

    const {
      name,
      questionsPerQuiz,
      timeLimitMinutes,
      marksPerQuestion,
      negativeMarking,
      negativeMarkingValue,
      randomizeQuestions,
      randomizeOptions,
      maxAttempts,
      examCode,
      showCorrectAnswers,
      showScoreToStudent,
      showLeaderboardToStudents,
      participantLimit,
      type
    } = req.body;

    const errors = [];
    if (name !== undefined && !isNonEmptyString(name, 120)) errors.push('name must be a non-empty string of 120 characters or fewer');
    const numericFields = {
      questionsPerQuiz: [1, 500],
      timeLimitMinutes: [1, 240],
      marksPerQuestion: [0, 100],
      negativeMarkingValue: [0, 100],
      maxAttempts: [1, 1]
    };
    const parsedNumbers = {};
    Object.entries(numericFields).forEach(([field, [min, max]]) => {
      if (req.body[field] === undefined) return;
      const value = Number(req.body[field]);
      if (!Number.isFinite(value) || value < min || value > max) {
        errors.push(`${field} must be a finite number between ${min} and ${max}`);
      } else {
        parsedNumbers[field] = value;
      }
    });
    if (participantLimit !== undefined && participantLimit !== null) {
      const value = Number(participantLimit);
      if (!Number.isFinite(value) || value < 1 || value > 100000) {
        errors.push('participantLimit must be null or a finite number between 1 and 100000');
      } else {
        parsedNumbers.participantLimit = value;
      }
    }
    ['negativeMarking', 'randomizeQuestions', 'randomizeOptions', 'showCorrectAnswers', 'showScoreToStudent', 'showLeaderboardToStudents']
      .forEach((field) => {
        if (req.body[field] !== undefined && typeof req.body[field] !== 'boolean') {
          errors.push(`${field} must be a boolean`);
        }
      });
    if (errors.length) return res.status(400).json({ error: 'Invalid round settings', details: errors });
    if (type !== undefined && !Object.values(ROUND_TYPES).includes(type)) {
      return res.status(400).json({ error: 'type must be a supported round type' });
    }

    let round = await QuizRound.findOne({ roundNumber });
    const isNew = !round;

    if (isNew) {
      if (!isNonEmptyString(examCode)) {
        return res.status(400).json({ error: 'An exam code is required to create a new round' });
      }
      round = new QuizRound({ roundNumber, name: name || `Round ${roundNumber}`, examCodeHash: 'pending' });
      await round.setExamCode(examCode);
    } else if (isNonEmptyString(examCode)) {
      await round.setExamCode(examCode);
    }

    if (name !== undefined) round.name = name;
    if (questionsPerQuiz !== undefined) round.questionsPerQuiz = parsedNumbers.questionsPerQuiz;
    if (timeLimitMinutes !== undefined) round.timeLimitMinutes = parsedNumbers.timeLimitMinutes;
    if (marksPerQuestion !== undefined) round.marksPerQuestion = parsedNumbers.marksPerQuestion;
    if (negativeMarking !== undefined) round.negativeMarking = negativeMarking;
    if (negativeMarkingValue !== undefined) round.negativeMarkingValue = parsedNumbers.negativeMarkingValue;
    if (randomizeQuestions !== undefined) round.randomizeQuestions = randomizeQuestions;
    if (randomizeOptions !== undefined) round.randomizeOptions = randomizeOptions;
    if (maxAttempts !== undefined) round.maxAttempts = parsedNumbers.maxAttempts;
    if (showCorrectAnswers !== undefined) round.showCorrectAnswers = showCorrectAnswers;
    if (showScoreToStudent !== undefined) round.showScoreToStudent = showScoreToStudent;
    if (showLeaderboardToStudents !== undefined) round.showLeaderboardToStudents = showLeaderboardToStudents;
    if (participantLimit !== undefined) round.participantLimit = participantLimit === null ? null : parsedNumbers.participantLimit;
    if (type !== undefined) round.type = type;

    await round.save();

    await AuditLog.create({
      admin: req.admin._id,
      action: isNew ? 'round.create' : 'round.update',
      details: { roundNumber },
      ipAddress: req.ip
    });

    res.status(isNew ? 201 : 200).json(round.toSafeJSON());
  })
);

router.post(
  '/:roundNumber/start',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const round = await QuizRound.findOne({ roundNumber: Number(req.params.roundNumber) });
    if (!round) return res.status(404).json({ error: 'Round not found' });
    if (round.status === ROUND_STATUS.ENDED) return res.status(409).json({ error: 'This round has ended and cannot be restarted' });
    round.status = ROUND_STATUS.ACTIVE;
    round.startedAt = new Date();
    await round.save();
    await AuditLog.create({ admin: req.admin._id, action: 'round.start', details: { roundNumber: round.roundNumber }, ipAddress: req.ip });
    res.json(round.toSafeJSON());
  })
);

router.post(
  '/:roundNumber/end',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const round = await QuizRound.findOne({ roundNumber: Number(req.params.roundNumber) });
    if (!round) return res.status(404).json({ error: 'Round not found' });
    round.status = ROUND_STATUS.ENDED;
    round.endedAt = new Date();
    await round.save();
    const activeAttempts = await Attempt.find({ round: round._id, status: 'in_progress' });
    await Promise.all(activeAttempts.map(async (attempt) => {
      const now = new Date();
      attempt.timeTakenSeconds = Math.min(Math.max(0, Math.round((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000)), round.timeLimitMinutes * 60);
      attempt.submittedAt = now;
      attempt.status = 'completed';
      await finalizeAttemptScore(attempt, round);
      await attempt.save();
    }));
    await AuditLog.create({ admin: req.admin._id, action: 'round.end', details: { roundNumber: round.roundNumber }, ipAddress: req.ip });
    res.json(round.toSafeJSON());
  })
);

module.exports = router;
