const express = require('express');
const Competition = require('../../models/Competition');
const Attempt = require('../../models/Attempt');
const AttendanceAssignment = require('../../models/AttendanceAssignment');
const JudgingScore = require('../../models/JudgingScore');
const AuditLog = require('../../models/AuditLog');
const { requireAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();
router.use(requireAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const competitions = await Competition.find({ status: { $ne: 'archived' } }).sort({ type: 1 }).lean();
  const mcq = competitions.find((item) => item.type === 'mcq');
  const promptRush = competitions.find((item) => item.type === 'prompt_rush');

  const [attempts, assignments, scores, activity] = await Promise.all([
    Attempt.find().populate('student', 'name rollNumber').populate('department', 'name').sort({ updatedAt: -1 }).limit(100).lean(),
    AttendanceAssignment.find().populate('student', 'name rollNumber').populate('volunteer', 'name').populate('competition', 'name type').lean(),
    JudgingScore.find({ competition: promptRush?._id }).populate('student', 'name rollNumber').populate('judge', 'name').sort({ updatedAt: -1 }).lean(),
    AuditLog.find().populate('admin', 'name username').sort({ createdAt: -1 }).limit(12).lean()
  ]);

  const mcqAttempts = attempts.filter((item) => item.roundNumber === 1);
  const mcqCompleted = mcqAttempts.filter((item) => ['completed', 'disqualified'].includes(item.status));
  const promptByStudent = new Map();
  scores.forEach((item) => {
    const key = item.student?._id?.toString();
    if (!key) return;
    const current = promptByStudent.get(key) || { student: item.student, scores: [], judges: new Set(), notes: [] };
    current.scores.push(item.score);
    current.judges.add(item.judge?._id?.toString());
    if (item.notes) current.notes.push(item.notes);
    promptByStudent.set(key, current);
  });

  const promptLeaderboard = [...promptByStudent.values()].map((item) => ({
    student: item.student?.name,
    rollNumber: item.student?.rollNumber,
    score: item.scores.reduce((sum, value) => sum + value, 0) / item.scores.length,
    judgeCount: item.judges.size,
    notes: item.notes.join(' | ')
  })).sort((a, b) => b.score - a.score).slice(0, 10);

  const assignmentSummary = assignments.reduce((summary, item) => {
    summary.total += 1;
    if (item.status === 'checked_in') summary.checkedIn += 1;
    if (item.competition?.type === 'mcq') summary.mcq += 1;
    if (item.competition?.type === 'prompt_rush') summary.promptRush += 1;
    return summary;
  }, { total: 0, checkedIn: 0, mcq: 0, promptRush: 0 });

  res.json({
    updatedAt: new Date(),
    competitions: competitions.map((competition) => ({
      id: competition._id,
      name: competition.name,
      type: competition.type,
      status: competition.status,
      schedule: competition.schedule,
      scoringRules: competition.scoringRules,
      participantsAllocated: assignments.filter((item) => item.competition?._id?.toString() === competition._id.toString()).length
    })),
    mcq: {
      active: mcqAttempts.filter((item) => item.status === 'in_progress').length,
      completed: mcqCompleted.length,
      disqualified: mcqAttempts.filter((item) => item.status === 'disqualified').length,
      topScore: mcqCompleted.sort((a, b) => b.score - a.score).slice(0, 10).map((item, index) => ({ rank: index + 1, student: item.student?.name, rollNumber: item.student?.rollNumber, score: item.score, maxScore: item.maxScore }))
    },
    promptRush: {
      judgedParticipants: promptByStudent.size,
      totalScores: scores.length,
      judgesActive: new Set(scores.map((item) => item.judge?._id?.toString()).filter(Boolean)).size,
      leaderboard: promptLeaderboard,
      maxScore: promptRush?.scoringRules?.reduce((sum, rule) => sum + rule.maxPoints, 0) || 0
    },
    attendance: assignmentSummary,
    activeAttempts: mcqAttempts.filter((item) => item.status === 'in_progress').slice(0, 12).map((item) => ({ student: item.student?.name, rollNumber: item.student?.rollNumber, deadlineAt: item.deadlineAt, violationCount: item.violationCount || 0 })),
    activity: activity.map((item) => ({ action: item.action, admin: item.admin?.name || item.admin?.username, createdAt: item.createdAt, details: item.details }))
  });
}));

module.exports = router;
