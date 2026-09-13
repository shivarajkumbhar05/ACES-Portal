const express = require('express');
const Student = require('../models/Student');
const QuizRound = require('../models/QuizRound');
const Attendance = require('../models/Attendance');
const AttendanceAssignment = require('../models/AttendanceAssignment');
const Competition = require('../models/Competition');
const { getCompetitionLifecycleError } = require('../utils/competitionLifecycle');
const { requireAdmin, requireRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { ADMIN_ROLES } = require('../config/constants');

const router = express.Router();
router.use(requireAdmin, requireRoles(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN, ADMIN_ROLES.VOLUNTEER));

router.get('/', asyncHandler(async (req, res) => {
  const roundNumber = Number(req.query.round || 1);
  const competitionId = req.query.competition;
  const round = await QuizRound.findOne({ roundNumber });
  const assignmentFilter = { ...(req.admin.role === ADMIN_ROLES.VOLUNTEER ? { volunteer: req.admin._id } : {}), ...(competitionId ? { competition: competitionId } : {}) };
  const assignments = await AttendanceAssignment.find(assignmentFilter).populate('student').lean();
  const assignedStudentIds = assignments.map((item) => item.student?._id).filter(Boolean);
  const students = await Student.find(assignedStudentIds.length ? { _id: { $in: assignedStudentIds } } : { _id: null }).populate('department', 'name').sort({ name: 1 }).lean();
  const records = round ? await Attendance.find({ round: round._id }).lean() : [];
  const byStudent = new Map(records.map((item) => [item.student.toString(), item]));
  const assignmentByStudent = new Map(assignments.map((item) => [item.student._id.toString(), item]));
  res.json(students.map((student) => ({
    id: student._id,
    name: student.name,
    rollNumber: student.rollNumber,
    phoneNumber: byStudent.get(student._id.toString())?.phoneNumber || student.phoneNumber || '',
    department: student.department?.name,
    present: Boolean(byStudent.get(student._id.toString())?.present || assignmentByStudent.get(student._id.toString())?.status === 'checked_in'),
    allocationStatus: assignmentByStudent.get(student._id.toString())?.status || 'assigned'
    ,assignedVolunteer: assignmentByStudent.get(student._id.toString())?.volunteer
  })));
}));

router.put('/', asyncHandler(async (req, res) => {
  const { studentId, roundNumber, competitionId, phoneNumber, present = true } = req.body;
  const round = await QuizRound.findOne({ roundNumber: Number(roundNumber) });
  const student = await Student.findById(studentId);
  const competition = competitionId ? await Competition.findById(competitionId) : null;
  if (competitionId && !competition) return res.status(400).json({ error: 'Competition not found' });
  if (competition && getCompetitionLifecycleError(competition)) return res.status(403).json({ error: 'competition_unavailable', message: getCompetitionLifecycleError(competition) });
  if (!round || !student || !String(phoneNumber || '').trim()) {
    return res.status(400).json({ error: 'Participant, round, and phone number are required' });
  }
  student.phoneNumber = String(phoneNumber).trim();
  await student.save();
  const record = await Attendance.findOneAndUpdate(
    { student: student._id, round: round._id },
    { student: student._id, round: round._id, roundNumber: round.roundNumber, volunteer: req.admin._id, phoneNumber: student.phoneNumber, present: Boolean(present), checkedInAt: new Date() },
    { new: true, upsert: true, runValidators: true }
  );
  if (competitionId) {
    await AttendanceAssignment.findOneAndUpdate(
      { competition: competitionId, student: student._id, volunteer: req.admin._id },
      { phoneNumber: student.phoneNumber, status: present ? 'checked_in' : 'assigned', checkedInAt: present ? new Date() : null, isLate: present && competitionId ? false : undefined }
    );
  }
  res.json(record);
}));

router.get('/check-in/:token', asyncHandler(async (req, res) => {
  const assignment = await AttendanceAssignment.findOne({ checkInToken: req.params.token }).populate('student', 'name rollNumber').populate('competition', 'name schedule');
  if (!assignment) return res.status(404).json({ error: 'Check-in code is invalid or expired' });
  const competition = await Competition.findById(assignment.competition?._id || assignment.competition);
  const lifecycleError = getCompetitionLifecycleError(competition);
  if (lifecycleError) return res.status(403).json({ error: 'competition_unavailable', message: lifecycleError });
  const now = new Date();
  const startsAt = assignment.competition?.schedule?.startsAt;
  assignment.status = 'checked_in';
  assignment.checkedInAt = now;
  assignment.isLate = Boolean(startsAt && now > new Date(startsAt));
  await assignment.save();
  res.json({ student: assignment.student, competition: assignment.competition, checkedInAt: assignment.checkedInAt, isLate: assignment.isLate });
}));

module.exports = router;
