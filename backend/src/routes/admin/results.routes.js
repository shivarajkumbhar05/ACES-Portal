const express = require('express');
const Attempt = require('../../models/Attempt');
const Question = require('../../models/Question');
const JudgingScore = require('../../models/JudgingScore');
const Competition = require('../../models/Competition');
const AttendanceAssignment = require('../../models/AttendanceAssignment');
const { requireAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { isValidObjectId } = require('../../utils/validators');

const router = express.Router();
router.use(requireAdmin);

/** GET /api/admin/results - filterable live results table. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { round, competition, department, status, minScore, from, to, page = 1, limit = 50 } = req.query;
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

    const [items, total, competitions, promptRush, assignments] = await Promise.all([
      Attempt.find(filter)
        .populate('student', 'name rollNumber')
        .populate('department', 'name')
        .sort({ submittedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Attempt.countDocuments(filter),
      Competition.find({ type: { $in: ['mcq', 'prompt_rush'] } }).lean(),
      Competition.findOne({ type: 'prompt_rush' }).lean(),
      AttendanceAssignment.find().select('competition student volunteer status phoneNumber').populate('volunteer', 'name').lean()
    ]);

    const assignmentByStudent = new Map(assignments.map((item) => [`${item.competition}:${item.student}`, item]));
    const mcqCompetition = competitions.find((item) => item.type === 'mcq');
    const mcqRows = items.map((a) => {
      const assignment = mcqCompetition ? assignmentByStudent.get(`${mcqCompetition._id}:${a.student?._id}`) : null;
      return {
      resultId: a._id,
      attemptId: a._id,
      source: 'mcq',
      competitionType: 'mcq',
      competition: mcqCompetition?.name || 'MCQ Competition',
      student: a.student?.name,
      rollNumber: a.student?.rollNumber,
      department: a.department?.name,
      departmentId: a.department?._id,
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
      ,attendanceStatus: assignment?.status || 'not_assigned'
      ,volunteer: assignment?.volunteer?.name
      };
    });

    let promptRows = [];
    if (promptRush && (!competition || competition === promptRush._id.toString() || competition === 'prompt_rush')) {
      const scores = await JudgingScore.find({ competition: promptRush._id })
        .populate('student', 'name rollNumber department')
        .populate({ path: 'student', populate: { path: 'department', select: 'name' } })
        .lean();
      const byStudent = new Map();
      scores.forEach((score) => {
        const key = score.student?._id?.toString();
        if (!key) return;
        const current = byStudent.get(key) || { scores: [], notes: [], student: score.student };
        current.scores.push(score.score);
        if (score.notes) current.notes.push(score.notes);
        byStudent.set(key, current);
      });
      promptRows = [...byStudent.values()].map((entry) => {
        const assignment = assignmentByStudent.get(`${promptRush._id}:${entry.student._id}`);
        const score = entry.scores.reduce((sum, value) => sum + value, 0) / entry.scores.length;
        return {
          resultId: `prompt-${entry.student._id}`,
          attemptId: null,
          source: 'judging',
          competitionType: 'prompt_rush',
          competition: promptRush.name,
          student: entry.student.name,
          rollNumber: entry.student.rollNumber,
          department: entry.student.department?.name,
          departmentId: entry.student.department?._id,
          status: 'judged',
          score,
          maxScore: promptRush.scoringRules.reduce((sum, rule) => sum + rule.maxPoints, 0),
          judgeCount: entry.scores.length,
          judgeNotes: entry.notes.join(' | '),
          attendanceStatus: assignment?.status || 'not_assigned',
          volunteer: assignment?.volunteer?.name,
          phoneNumber: assignment?.phoneNumber || '',
          submittedAt: null
        };
      });
    }

    const rows = [...mcqRows, ...promptRows].filter((row) => {
      if (competition === 'mcq' && row.competitionType !== 'mcq') return false;
      if (competition === 'prompt_rush' && row.competitionType !== 'prompt_rush') return false;
      if (status && row.status !== status) return false;
      if (department && row.department !== department && row.departmentId !== department) return false;
      if (minScore && Number(row.score) < Number(minScore)) return false;
      return true;
    });

    const start = (pageNum - 1) * limitNum;
    res.json({ items: rows.slice(start, start + limitNum), total: rows.length, page: pageNum, pages: Math.max(1, Math.ceil(rows.length / limitNum)) });
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
