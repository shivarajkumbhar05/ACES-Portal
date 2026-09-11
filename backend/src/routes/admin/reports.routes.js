const express = require('express');
const { Parser } = require('json2csv');
const Attempt = require('../../models/Attempt');
const Qualification = require('../../models/Qualification');
const Student = require('../../models/Student');
const { requireAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();
router.use(requireAdmin);

function sendCSV(res, filename, rows) {
  if (!rows.length) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send('No data available for this report\n');
  }
  const parser = new Parser({ fields: Object.keys(rows[0]) });
  const csv = parser.parse(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

/** All participants (registered students, across departments). */
router.get(
  '/participants',
  asyncHandler(async (req, res) => {
    const students = await Student.find().populate('department', 'name').lean();
    const rows = students.map((s) => ({
      Name: s.name,
      'Roll Number': s.rollNumber,
      Department: s.department?.name,
      'Registered At': s.createdAt
    }));
    sendCSV(res, 'all_participants.csv', rows);
  })
);

/** Round 1 / Round 2 results. */
router.get(
  '/results/:roundNumber',
  asyncHandler(async (req, res) => {
    const roundNumber = Number(req.params.roundNumber);
    const attempts = await Attempt.find({ roundNumber, status: 'completed' })
      .populate('student', 'name rollNumber')
      .populate('department', 'name')
      .sort({ score: -1, timeTakenSeconds: 1 })
      .lean();

    const rows = attempts.map((a, i) => ({
      Rank: i + 1,
      Student: a.student?.name,
      'Roll Number': a.student?.rollNumber,
      Department: a.department?.name,
      Score: a.score,
      'Max Score': a.maxScore,
      Correct: a.correctAnswers,
      Wrong: a.wrongAnswers,
      Unanswered: a.unanswered,
      Status: a.status,
      'Violation Count': a.violationCount || 0,
      'Violation Reason': a.violationReason || '',
      'Time Taken (s)': a.timeTakenSeconds,
      'Submitted At': a.submittedAt
    }));

    sendCSV(res, `round_${roundNumber}_results.csv`, rows);
  })
);

/** Department-wise results for Round 1. */
router.get(
  '/department-results',
  asyncHandler(async (req, res) => {
    const attempts = await Attempt.find({ roundNumber: 1, status: 'completed' })
      .populate('student', 'name rollNumber')
      .populate('department', 'name')
      .sort({ department: 1, score: -1, timeTakenSeconds: 1 })
      .lean();

    const rows = attempts.map((a) => ({
      Department: a.department?.name,
      Student: a.student?.name,
      'Roll Number': a.student?.rollNumber,
      Score: a.score,
      Percentage: a.percentage,
      Status: a.status,
      'Violation Count': a.violationCount || 0,
      'Violation Reason': a.violationReason || '',
      'Time Taken (s)': a.timeTakenSeconds
    }));

    sendCSV(res, 'department_wise_results.csv', rows);
  })
);

/** Round 2 qualifiers (finalized or draft). */
router.get(
  '/round2-qualifiers',
  asyncHandler(async (req, res) => {
    const qualifications = await Qualification.find({ forRound: 2 })
      .populate('student', 'name rollNumber')
      .populate('department', 'name')
      .sort({ department: 1, rank: 1 })
      .lean();

    const rows = qualifications.map((q) => ({
      Department: q.department?.name,
      Rank: q.rank,
      Student: q.student?.name,
      'Roll Number': q.student?.rollNumber,
      Score: q.score,
      'Time Taken (s)': q.timeTakenSeconds,
      Qualified: q.qualified ? 'Yes' : 'No',
      Finalized: q.finalized ? 'Yes' : 'No',
      'Tie-break Reason': q.tieBreakReason || ''
    }));

    sendCSV(res, 'round2_qualifiers.csv', rows);
  })
);

/** Final overall leaderboard (Round 2 completed attempts, or Round 1 if no Round 2 data yet). */
router.get(
  '/final-leaderboard',
  asyncHandler(async (req, res) => {
    const attempts = await Attempt.find({ roundNumber: 2, status: 'completed' })
      .populate('student', 'name rollNumber')
      .populate('department', 'name')
      .sort({ score: -1, timeTakenSeconds: 1 })
      .lean();

    const rows = attempts.map((a, i) => ({
      Rank: i + 1,
      Student: a.student?.name,
      'Roll Number': a.student?.rollNumber,
      Department: a.department?.name,
      Score: a.score,
      Percentage: a.percentage,
      Status: a.status,
      'Violation Count': a.violationCount || 0,
      'Violation Reason': a.violationReason || '',
      'Time Taken (s)': a.timeTakenSeconds
    }));

    sendCSV(res, 'final_leaderboard.csv', rows);
  })
);

module.exports = router;
