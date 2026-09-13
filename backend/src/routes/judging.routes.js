const express = require('express');
const Student = require('../models/Student');
const QuizRound = require('../models/QuizRound');
const JudgingScore = require('../models/JudgingScore');
const Competition = require('../models/Competition');
const AttendanceAssignment = require('../models/AttendanceAssignment');
const { requireAdmin, requireRoles } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../middleware/errorHandler');
const { ADMIN_ROLES } = require('../config/constants');
const { getCompetitionLifecycleError } = require('../utils/competitionLifecycle');

const router = express.Router();
router.use(requireAdmin, requireRoles(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN, ADMIN_ROLES.JUDGE));

router.get('/participants', asyncHandler(async (req, res) => {
  const students = await Student.find().populate('department', 'name').sort({ name: 1 }).lean();
  const competition = await Competition.findOne({ _id: req.query.competition, type: 'prompt_rush' });
  const assignments = competition ? await AttendanceAssignment.find({ competition: competition._id, judges: req.admin._id }).select('student').lean() : [];
  const allocatedIds = new Set(assignments.map((item) => item.student.toString()));
  const scores = competition ? await JudgingScore.find({ competition: competition._id, judge: req.admin._id }).lean() : [];
  const scoreByStudent = new Map(scores.map((item) => [item.student.toString(), item]));
  const maxScore = competition?.scoringRules?.reduce((total, rule) => total + rule.maxPoints, 0) || 0;
  res.json(students.filter((student) => allocatedIds.has(student._id.toString())).map((student) => ({
    id: student._id,
    name: student.name,
    rollNumber: student.rollNumber,
    phoneNumber: student.phoneNumber,
    department: student.department?.name,
    score: scoreByStudent.get(student._id.toString())?.score ?? null,
    notes: scoreByStudent.get(student._id.toString())?.notes || '',
    maxScore,
    scoringRules: competition?.scoringRules || [],
    rubricScores: scoreByStudent.get(student._id.toString())?.rubricScores || [],
    scoreStatus: scoreByStudent.get(student._id.toString())?.status || 'draft',
    scoreId: scoreByStudent.get(student._id.toString())?._id || null
  })));
}));

router.put('/scores', asyncHandler(async (req, res) => {
  const { studentId, competitionId, score, rubricScores = [], notes = '', conflictDeclared = false, submit = false } = req.body;
  const competition = await Competition.findOne({ _id: competitionId, type: 'prompt_rush' });
  if (!competition) return res.status(400).json({ error: 'A valid Prompt Rush competition is required' });
  const lifecycleError = getCompetitionLifecycleError(competition);
  if (lifecycleError) return res.status(403).json({ error: 'competition_unavailable', message: lifecycleError });
  const maxScore = competition?.scoringRules?.reduce((total, rule) => total + rule.maxPoints, 0) || 1000;
  const numericScores = competition?.scoringRules?.map((rule) => ({
    ruleId: rule._id,
    label: rule.label,
    score: Number(rubricScores.find((item) => String(item.ruleId) === String(rule._id))?.score || 0)
  })) || [];
  const numericScore = numericScores.reduce((total, item) => total + item.score, 0);
  const invalidRubric = numericScores.some((item, index) => item.score < 0 || item.score > competition.scoringRules[index].maxPoints);
  if (!studentId || !Number.isFinite(numericScore) || numericScore < 0 || numericScore > maxScore || invalidRubric || (submit && conflictDeclared !== true)) {
    return res.status(400).json({ error: `A valid participant and score from 0 to ${maxScore} are required` });
  }
  const existing = await JudgingScore.findOne({ student: studentId, competition: competition._id, judge: req.admin._id });
  if (existing && ['locked', 'approved'].includes(existing.status)) return res.status(409).json({ error: 'This score is locked and requires admin approval to change' });
  const result = await JudgingScore.findOneAndUpdate(
    { student: studentId, competition: competition._id, judge: req.admin._id },
    { student: studentId, competition: competition._id, judge: req.admin._id, score: numericScore, rubricScores: numericScores, notes: String(notes).slice(0, 2000), conflictDeclared: Boolean(conflictDeclared), status: submit ? 'submitted' : 'draft', submittedAt: submit ? new Date() : existing?.submittedAt || null },
    { new: true, upsert: true, runValidators: true }
  );
  res.json(result);
}));

router.post('/scores/:scoreId/lock', asyncHandler(async (req, res) => {
  const score = await JudgingScore.findOneAndUpdate({ _id: req.params.scoreId, judge: req.admin._id, status: 'submitted' }, { status: 'locked', lockedAt: new Date() }, { new: true });
  if (!score) return res.status(409).json({ error: 'Only submitted scores can be locked' });
  await AuditLog.create({ admin: req.admin._id, action: 'judging.score_locked', details: { scoreId: score._id }, ipAddress: req.ip });
  res.json(score);
}));

router.get('/review', requireRoles(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), asyncHandler(async (req, res) => {
  const scores = await JudgingScore.find().populate('student', 'name rollNumber').populate('judge', 'name username').populate('competition', 'name type scoringRules').sort({ updatedAt: -1 }).lean();
  res.json(scores);
}));

router.get('/review/comparison', requireRoles(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), asyncHandler(async (req, res) => {
  const scores = await JudgingScore.find({ competition: { $exists: true } })
    .populate('student', 'name rollNumber department')
    .populate('judge', 'name username')
    .populate('competition', 'name type scoringRules')
    .sort({ student: 1, updatedAt: -1 })
    .lean();
  const groups = new Map();
  scores.forEach((score) => {
    const key = `${score.competition?._id}:${score.student?._id}`;
    const group = groups.get(key) || { student: score.student, competition: score.competition, scores: [] };
    group.scores.push(score);
    groups.set(key, group);
  });
  res.json([...groups.values()].map((group) => {
    const approvedScores = group.scores.filter((score) => score.status === 'approved');
    return {
      ...group,
      approvedCount: approvedScores.length,
      average: approvedScores.length === 2 ? approvedScores.reduce((sum, score) => sum + score.score, 0) / 2 : null,
      ready: approvedScores.length === 2
    };
  }));
}));

router.post('/review/:scoreId/:decision', requireRoles(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN), asyncHandler(async (req, res) => {
  if (!['approve', 'reject'].includes(req.params.decision)) return res.status(400).json({ error: 'Decision must be approve or reject' });
  const status = req.params.decision === 'approve' ? 'approved' : 'rejected';
  const score = await JudgingScore.findByIdAndUpdate(req.params.scoreId, { status, approvedAt: new Date(), approvedBy: req.admin._id }, { new: true });
  if (!score) return res.status(404).json({ error: 'Judging score not found' });
  await AuditLog.create({ admin: req.admin._id, action: `judging.score_${status}`, details: { scoreId: score._id }, ipAddress: req.ip });
  res.json(score);
}));

module.exports = router;
