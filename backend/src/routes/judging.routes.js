const express = require('express');
const Student = require('../models/Student');
const QuizRound = require('../models/QuizRound');
const JudgingScore = require('../models/JudgingScore');
const Competition = require('../models/Competition');
const { requireAdmin, requireRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { ADMIN_ROLES } = require('../config/constants');

const router = express.Router();
router.use(requireAdmin, requireRoles(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN, ADMIN_ROLES.JUDGE));

router.get('/participants', asyncHandler(async (req, res) => {
  const students = await Student.find().populate('department', 'name').sort({ name: 1 }).lean();
  const competition = await Competition.findOne({ _id: req.query.competition, type: 'prompt_rush' });
  const scores = competition ? await JudgingScore.find({ competition: competition._id, judge: req.admin._id }).lean() : [];
  const scoreByStudent = new Map(scores.map((item) => [item.student.toString(), item]));
  res.json(students.map((student) => ({
    id: student._id,
    name: student.name,
    rollNumber: student.rollNumber,
    phoneNumber: student.phoneNumber,
    department: student.department?.name,
    score: scoreByStudent.get(student._id.toString())?.score ?? null,
    notes: scoreByStudent.get(student._id.toString())?.notes || ''
  })));
}));

router.put('/scores', asyncHandler(async (req, res) => {
  const { studentId, competitionId, score, notes = '' } = req.body;
  const numericScore = Number(score);
  const competition = await Competition.findOne({ _id: competitionId, type: 'prompt_rush' });
  const maxScore = competition?.scoringRules?.reduce((total, rule) => total + rule.maxPoints, 0) || 1000;
  if (!competition || !studentId || !Number.isFinite(numericScore) || numericScore < 0 || numericScore > maxScore) {
    return res.status(400).json({ error: `A valid participant and score from 0 to ${maxScore} are required` });
  }
  const result = await JudgingScore.findOneAndUpdate(
    { student: studentId, competition: competition._id, judge: req.admin._id },
    { student: studentId, competition: competition._id, judge: req.admin._id, score: numericScore, notes: String(notes).slice(0, 2000) },
    { new: true, upsert: true, runValidators: true }
  );
  res.json(result);
}));

module.exports = router;
