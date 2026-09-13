const express = require('express');
const Department = require('../models/Department');
const QuizRound = require('../models/QuizRound');
const { asyncHandler } = require('../middleware/errorHandler');
const Competition = require('../models/Competition');
const Attempt = require('../models/Attempt');
const JudgingScore = require('../models/JudgingScore');

const router = express.Router();

router.get(
  '/departments',
  asyncHandler(async (req, res) => {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments);
  })
);

// Lightweight public status so the home page can show "Round 1 is live" etc,
// without leaking exam codes or question data.
router.get(
  '/rounds/status',
  asyncHandler(async (req, res) => {
    const rounds = await QuizRound.find().select('roundNumber name status startedAt endedAt').sort({ roundNumber: 1 });
    res.json(rounds);
  })
);

router.get('/competitions', asyncHandler(async (req, res) => {
  const competitions = await Competition.find({ status: { $ne: 'archived' } })
    .select('name type description venue date status schedule scoringRules')
    .sort({ type: 1 });
  res.json(competitions);
}));

router.get('/leaderboard/:type', asyncHandler(async (req, res) => {
  const competition = await Competition.findOne({ type: req.params.type, resultsPublished: true }).lean();
  if (!competition) return res.status(404).json({ error: 'Results are not published yet' });
  if (competition.type === 'mcq') {
    const rows = await Attempt.find({ roundNumber: 1, status: 'completed' }).populate('student', 'name rollNumber').populate('department', 'name').sort({ score: -1, timeTakenSeconds: 1 }).limit(100).lean();
    return res.json({ competition: competition.name, items: rows.map((row, index) => ({ rank: index + 1, student: row.student?.name, rollNumber: row.student?.rollNumber, department: row.department?.name, score: row.score, maxScore: row.maxScore })) });
  }
  const scores = await JudgingScore.find({ competition: competition._id, status: 'approved' }).populate('student', 'name rollNumber').lean();
  const byStudent = new Map();
  scores.forEach((row) => { const key = row.student?._id?.toString(); if (!key) return; const current = byStudent.get(key) || { student: row.student, scores: [] }; current.scores.push(row.score); byStudent.set(key, current); });
  const items = [...byStudent.values()].filter((row) => row.scores.length === 2).map((row) => ({ student: row.student.name, rollNumber: row.student.rollNumber, score: row.scores.reduce((sum, value) => sum + value, 0) / 2, maxScore: competition.scoringRules.reduce((sum, rule) => sum + rule.maxPoints, 0) })).sort((a, b) => b.score - a.score).map((row, index) => ({ ...row, rank: index + 1 }));
  res.json({ competition: competition.name, items });
}));

router.get('/institution', (req, res) => {
  res.json({
    institution: "SHRI. VATVRUKSHA SWAMI MAHARAJ DEVASTHAN'S Kai. Kalyanrao (Balasaheb) Ingale Polytechnic, Akkalkot",
    association: 'Association of Computer Engineering Students (ACES)',
    event: "QUIZ COMPETITION ON THE OCCASION OF ENGINEER'S DAY",
    date: '15 September 2026 (Tuesday)',
    time: '10:00 AM - 12:00 PM',
    venue: 'Computer Engineering Department, Lab No. 3, Ground Floor',
    committee: {
      principal: { title: 'Principal', name: 'Mr.Jeure.N.B' },
      hod: { title: 'HOD, Computer Engineering Department', name: 'Mr.Gaikwad.S.T' },
      coordinator: { title: 'Co-Ordinator', name: 'Mr.Nigadale.G.A' },
      president: { title: 'President, ACES Committee 2026-27', name: 'Mr.Kumbhar.S.S' }
    }
  });
});

module.exports = router;
