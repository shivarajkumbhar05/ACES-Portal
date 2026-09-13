const express = require('express');
const Competition = require('../../models/Competition');
const QuizRound = require('../../models/QuizRound');
const AttendanceAssignment = require('../../models/AttendanceAssignment');
const JudgingScore = require('../../models/JudgingScore');
const AuditLog = require('../../models/AuditLog');
const { requireAdmin, requireSuperAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { isNonEmptyString } = require('../../utils/validators');
const { COMPETITION_TYPES } = require('../../config/constants');

const router = express.Router();
router.use(requireAdmin, requireSuperAdmin);

router.get('/', asyncHandler(async (req, res) => {
  res.json(await Competition.find().sort({ createdAt: -1 }).lean());
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, type, description = '', date, venue = '', status = 'draft', schedule = {}, scoringRules = [] } = req.body;
  if (!isNonEmptyString(name, 160) || !Object.values(COMPETITION_TYPES).includes(type) || !['draft', 'published', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Name, competition type, and valid status are required' });
  }
  if (await Competition.exists({ type })) return res.status(409).json({ error: `The ${type} competition already exists` });
  const competition = await Competition.create({ name: name.trim(), type, description, date: date || undefined, venue, status, schedule, scoringRules, createdBy: req.admin._id });
  res.status(201).json(competition);
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const allowed = ['name', 'description', 'date', 'venue', 'status', 'schedule', 'scoringRules'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const competition = await Competition.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!competition) return res.status(404).json({ error: 'Competition not found' });
  res.json(competition);
}));

router.post('/:id/pause', asyncHandler(async (req, res) => {
  const competition = await Competition.findByIdAndUpdate(
    req.params.id,
    { $set: { 'schedule.isPaused': Boolean(req.body.paused), 'schedule.pauseReason': String(req.body.reason || '').slice(0, 240) } },
    { new: true, runValidators: true }
  );
  if (!competition) return res.status(404).json({ error: 'Competition not found' });
  res.json(competition);
}));

router.post('/:id/end', asyncHandler(async (req, res) => {
  const competition = await Competition.findById(req.params.id);
  if (!competition) return res.status(404).json({ error: 'Competition not found' });
  if (competition.schedule?.isEnded) return res.status(409).json({ error: 'Competition has already ended' });
  competition.schedule.isEnded = true;
  competition.schedule.isPaused = true;
  competition.schedule.endedAt = new Date();
  competition.schedule.pauseReason = 'Competition ended by administrator';
  await competition.save();
  await AuditLog.create({ admin: req.admin._id, action: 'competition.end', details: { competitionId: competition._id, type: competition.type }, ipAddress: req.ip });
  res.json(competition);
}));

router.post('/:id/publish-results', asyncHandler(async (req, res) => {
  const competition = await Competition.findById(req.params.id);
  if (!competition) return res.status(404).json({ error: 'Competition not found' });
  if (competition.type === 'mcq') {
    const round = await QuizRound.findOne({ roundNumber: 1 }).select('status').lean();
    if (round?.status !== 'ended') return res.status(409).json({ error: 'End the MCQ round before publishing results' });
  } else if (!competition.schedule?.isEnded) {
    return res.status(409).json({ error: 'End the Prompt Rush competition before publishing results' });
  }
  if (competition.type === 'prompt_rush') {
    const assignments = await AttendanceAssignment.find({ competition: competition._id }).select('student').lean();
    const studentIds = assignments.map((item) => item.student);
    if (!studentIds.length) return res.status(409).json({ error: 'Allocate Prompt Rush participants before publishing results' });
    const approvedScores = await JudgingScore.find({ competition: competition._id, student: { $in: studentIds }, status: 'approved' }).select('student').lean();
    const approvedByStudent = new Map();
    approvedScores.forEach((item) => approvedByStudent.set(item.student.toString(), (approvedByStudent.get(item.student.toString()) || 0) + 1));
    const incomplete = studentIds.filter((studentId) => (approvedByStudent.get(studentId.toString()) || 0) !== 2).length;
    if (incomplete) return res.status(409).json({ error: `${incomplete} allocated participant${incomplete === 1 ? '' : 's'} need exactly two approved judge scores before results can be published` });
  }
  competition.resultsPublished = true;
  competition.resultsPublishedAt = new Date();
  await competition.save();
  await AuditLog.create({ admin: req.admin._id, action: 'competition.results_published', details: { competitionId: competition._id, type: competition.type }, ipAddress: req.ip });
  res.json(competition);
}));

module.exports = router;
