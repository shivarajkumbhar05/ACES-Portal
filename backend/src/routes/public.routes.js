const express = require('express');
const Department = require('../models/Department');
const QuizRound = require('../models/QuizRound');
const { asyncHandler } = require('../middleware/errorHandler');
const Competition = require('../models/Competition');

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
