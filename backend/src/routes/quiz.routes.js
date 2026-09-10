const express = require('express');
const Student = require('../models/Student');
const Department = require('../models/Department');
const QuizRound = require('../models/QuizRound');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const { signStudentToken } = require('../utils/jwt');
const { requireStudentAttempt } = require('../middleware/auth');
const { examEntryLimiter, answerSubmitLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');
const { isNonEmptyString, isRollNumber, isValidObjectId, isOptionKey, sanitizeText } = require('../utils/validators');
const { shuffle, sampleRandom } = require('../utils/shuffle');
const { finalizeAttemptScore } = require('../services/scoring.service');
const { isQualifiedForRound } = require('../services/qualification.service');
const { ROUND_STATUS, ATTEMPT_STATUS } = require('../config/constants');

const router = express.Router();

function getIO(req) {
  return req.app.get('io');
}

/**
 * Builds the student-safe view of the current question set: never includes
 * the correct answer, and option labels are re-mapped through the attempt's
 * stored shuffle order.
 */
async function buildStudentQuestionView(attempt) {
  const questionIds = attempt.questions.map((q) => q.question);
  const questions = await Question.find({ _id: { $in: questionIds } }).lean();
  const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

  return attempt.questions
    .sort((a, b) => a.order - b.order)
    .map((aq) => {
      const master = questionMap.get(aq.question.toString());
      const options = aq.optionOrder.map((key) => master.options[key]);
      return {
        order: aq.order,
        questionId: aq.question.toString(),
        questionText: master.questionText,
        options, // array of 4 strings in display order, position = index
        marks: aq.marks,
        selectedPosition: aq.selectedPosition,
        answered: aq.selectedPosition !== null && aq.selectedPosition !== undefined
      };
    });
}

function remainingSeconds(attempt) {
  const ms = new Date(attempt.deadlineAt).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}

/**
 * POST /api/quiz/verify
 * Student directly enters: name, rollNumber, department, examCode, roundNumber.
 * No account creation flow - a Student record is created/reused transparently.
 */
router.post(
  '/verify',
  examEntryLimiter,
  asyncHandler(async (req, res) => {
    const { name, rollNumber, departmentId, examCode, roundNumber } = req.body;

    if (!isNonEmptyString(name, 120)) return res.status(400).json({ error: 'Please enter your full name' });
    if (!isRollNumber(rollNumber)) return res.status(400).json({ error: 'Please enter a valid roll number' });
    if (!isValidObjectId(departmentId)) return res.status(400).json({ error: 'Please select your department' });
    if (!isNonEmptyString(examCode, 50)) return res.status(400).json({ error: 'Please enter the exam code' });
    const round = Number(roundNumber) === 2 ? 2 : 1;

    const department = await Department.findById(departmentId);
    if (!department) return res.status(400).json({ error: 'Invalid department selected' });

    const quizRound = await QuizRound.findOne({ roundNumber: round });
    if (!quizRound) return res.status(404).json({ error: `Round ${round} has not been configured yet` });

    if (quizRound.status !== ROUND_STATUS.ACTIVE) {
      return res.status(403).json({ error: `Round ${round} is not currently active` });
    }

    const codeOk = await quizRound.verifyExamCode(examCode);
    if (!codeOk) return res.status(401).json({ error: 'Invalid exam code' });

    const cleanName = sanitizeText(name).slice(0, 120);
    const cleanRoll = rollNumber.trim().toUpperCase();

    let student = await Student.findOne({ rollNumber: cleanRoll, department: department._id });
    if (!student) {
      student = await Student.create({ name: cleanName, rollNumber: cleanRoll, department: department._id });
    }

    // Round 2 gate: only finalized qualifiers may enter.
    if (round === 2) {
      const qualified = await isQualifiedForRound(student._id, 2);
      if (!qualified) {
        return res.status(403).json({
          error: 'not_qualified',
          message: 'Thank you for participating in Round 1. You did not qualify for Round 2.'
        });
      }
    }

    if (quizRound.participantLimit !== null && quizRound.participantLimit !== undefined) {
      const participantCount = await Attempt.countDocuments({ round: quizRound._id, department: department._id });
      if (participantCount >= quizRound.participantLimit) {
        return res.status(409).json({ error: 'participant_limit_reached', message: 'This round has reached its participant limit for your department.' });
      }
    }

    // Enforce max attempts / prevent duplicate attempts.
    const existingAttempt = await Attempt.findOne({ student: student._id, round: quizRound._id });
    if (existingAttempt) {
      if (existingAttempt.status === ATTEMPT_STATUS.IN_PROGRESS && remainingSeconds(existingAttempt) > 0) {
        // Resume the same in-progress attempt instead of blocking outright.
        const token = signStudentToken(existingAttempt);
        const questions = await buildStudentQuestionView(existingAttempt);
        return res.json({
          token,
          resumed: true,
          attempt: {
            id: existingAttempt._id,
            roundNumber: existingAttempt.roundNumber,
            totalQuestions: existingAttempt.totalQuestions,
            deadlineAt: existingAttempt.deadlineAt,
            remainingSeconds: remainingSeconds(existingAttempt)
          },
          questions
        });
      }
      return res.status(409).json({
        error: 'already_attempted',
        message: 'You have already attempted this round. Only one attempt is allowed.'
      });
    }

    // Build the question set for this attempt.
    const questionPool = await Question.find({ round: quizRound._id, isActive: true }).lean();
    if (questionPool.length < quizRound.questionsPerQuiz) {
      return res.status(500).json({
        error: 'Question bank does not have enough active questions configured for this round yet.'
      });
    }

    const selected = quizRound.randomizeQuestions
      ? sampleRandom(questionPool, quizRound.questionsPerQuiz)
      : questionPool.slice(0, quizRound.questionsPerQuiz);

    const attemptQuestions = selected.map((q, index) => {
      const optionOrder = quizRound.randomizeOptions ? shuffle(['A', 'B', 'C', 'D']) : ['A', 'B', 'C', 'D'];
      return {
        question: q._id,
        order: index,
        optionOrder,
        marks: quizRound.marksPerQuestion,
        selectedPosition: null,
        isCorrect: null,
        answeredAt: null
      };
    });

    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + quizRound.timeLimitMinutes * 60 * 1000);

    const attempt = await Attempt.create({
      student: student._id,
      round: quizRound._id,
      roundNumber: round,
      department: department._id,
      questions: attemptQuestions,
      status: ATTEMPT_STATUS.IN_PROGRESS,
      startedAt,
      deadlineAt,
      totalQuestions: attemptQuestions.length,
      maxScore: attemptQuestions.reduce((sum, q) => sum + q.marks, 0),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const token = signStudentToken(attempt);
    const questions = await buildStudentQuestionView(attempt);

    const io = getIO(req);
    if (io) io.emit('participant:started', { roundNumber: round, departmentId: department._id });

    res.status(201).json({
      token,
      resumed: false,
      attempt: {
        id: attempt._id,
        roundNumber: attempt.roundNumber,
        totalQuestions: attempt.totalQuestions,
        deadlineAt: attempt.deadlineAt,
        remainingSeconds: remainingSeconds(attempt)
      },
      questions
    });
  })
);

/** GET /api/quiz/session - re-fetch current state (e.g. on page reload). */
router.get(
  '/session',
  requireStudentAttempt,
  asyncHandler(async (req, res) => {
    const { attempt } = req;
    if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
      return res.status(409).json({ error: 'This attempt has already been submitted' });
    }
    if (remainingSeconds(attempt) <= 0) {
      return res.status(410).json({ error: 'time_expired', message: 'Time is up for this attempt' });
    }
    const questions = await buildStudentQuestionView(attempt);
    res.json({
      attempt: {
        id: attempt._id,
        roundNumber: attempt.roundNumber,
        totalQuestions: attempt.totalQuestions,
        deadlineAt: attempt.deadlineAt,
        remainingSeconds: remainingSeconds(attempt)
      },
      questions
    });
  })
);

/** POST /api/quiz/answer - save/update a single answer. */
router.post(
  '/answer',
  answerSubmitLimiter,
  requireStudentAttempt,
  asyncHandler(async (req, res) => {
    const { attempt } = req;
    const { questionId, position } = req.body;

    if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
      return res.status(409).json({ error: 'This attempt has already been submitted' });
    }
    if (remainingSeconds(attempt) <= 0) {
      return res.status(410).json({ error: 'time_expired', message: 'Time is up. Your quiz will be auto-submitted.' });
    }
    if (!isValidObjectId(questionId)) return res.status(400).json({ error: 'Invalid question id' });
    if (position !== null && (typeof position !== 'number' || position < 0 || position > 3)) {
      return res.status(400).json({ error: 'Invalid option position' });
    }

    const aq = attempt.questions.find((q) => q.question.toString() === questionId);
    if (!aq) return res.status(404).json({ error: 'Question does not belong to this attempt' });

    const answeredAt = position === null ? null : new Date();
    const result = await Attempt.updateOne(
      {
        _id: attempt._id,
        status: ATTEMPT_STATUS.IN_PROGRESS,
        deadlineAt: { $gt: new Date() },
        'questions.question': questionId
      },
      {
        $set: {
          'questions.$.selectedPosition': position,
          'questions.$.answeredAt': answeredAt
        }
      }
    );

    if (!result.matchedCount) {
      return res.status(410).json({ error: 'time_expired', message: 'Time is up. Your quiz will be auto-submitted.' });
    }

    res.json({ ok: true, questionId, position });
  })
);

/** POST /api/quiz/submit - server-side scoring, no trust in client-provided scores. */
router.post(
  '/submit',
  answerSubmitLimiter,
  requireStudentAttempt,
  asyncHandler(async (req, res) => {
    const { attempt } = req;
    if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
      return res.status(409).json({ error: 'This attempt has already been submitted' });
    }

    const round = await QuizRound.findById(attempt.round);
    const now = new Date();
    const secondsUsed = Math.round((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000);
    // Clamp to the time limit in case of clock skew - a student can never be
    // credited with "negative" overtime, nor scored on a late submit.
    attempt.timeTakenSeconds = Math.min(secondsUsed, round.timeLimitMinutes * 60);
    attempt.submittedAt = now;
    attempt.status = new Date() > new Date(attempt.deadlineAt) ? ATTEMPT_STATUS.EXPIRED : ATTEMPT_STATUS.COMPLETED;
    if (attempt.status === ATTEMPT_STATUS.EXPIRED) attempt.status = ATTEMPT_STATUS.COMPLETED; // still scored, just flagged via timeTaken

    await finalizeAttemptScore(attempt, round);
    await attempt.save();

    const io = getIO(req);
    if (io) {
      io.emit('attempt:completed', {
        roundNumber: attempt.roundNumber,
        departmentId: attempt.department,
        attemptId: attempt._id
      });
    }

    const student = await Student.findById(attempt.student).populate('department');

    res.json({
      student: { name: student.name, rollNumber: student.rollNumber, department: student.department.name },
      roundNumber: attempt.roundNumber,
      totalQuestions: attempt.totalQuestions,
      attemptedQuestions: attempt.attemptedQuestions,
      correctAnswers: attempt.correctAnswers,
      wrongAnswers: attempt.wrongAnswers,
      unanswered: attempt.unanswered,
      score: round.showScoreToStudent ? attempt.score : null,
      maxScore: round.showScoreToStudent ? attempt.maxScore : null,
      percentage: round.showScoreToStudent ? attempt.percentage : null,
      timeTakenSeconds: attempt.timeTakenSeconds
    });
  })
);

/** GET /api/quiz/result - fetch the personal result again later (e.g. refresh). */
router.get(
  '/result',
  requireStudentAttempt,
  asyncHandler(async (req, res) => {
    const { attempt } = req;
    if (attempt.status === ATTEMPT_STATUS.IN_PROGRESS) {
      return res.status(409).json({ error: 'Quiz not yet submitted' });
    }
    const round = await QuizRound.findById(attempt.round);
    const student = await Student.findById(attempt.student).populate('department');

    let qualification = null;
    if (attempt.roundNumber === 1) {
      const Qualification = require('../models/Qualification');
      const q = await Qualification.findOne({ student: student._id, forRound: 2, finalized: true });
      if (q) qualification = { qualified: q.qualified, rank: q.rank };
    }

    res.json({
      student: { name: student.name, rollNumber: student.rollNumber, department: student.department.name },
      roundNumber: attempt.roundNumber,
      totalQuestions: attempt.totalQuestions,
      attemptedQuestions: attempt.attemptedQuestions,
      correctAnswers: attempt.correctAnswers,
      wrongAnswers: attempt.wrongAnswers,
      unanswered: attempt.unanswered,
      score: round.showScoreToStudent ? attempt.score : null,
      maxScore: round.showScoreToStudent ? attempt.maxScore : null,
      percentage: round.showScoreToStudent ? attempt.percentage : null,
      timeTakenSeconds: attempt.timeTakenSeconds,
      qualification
    });
  })
);

module.exports = router;
