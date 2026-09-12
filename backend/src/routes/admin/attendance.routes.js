const express = require('express');
const crypto = require('crypto');
const { Parser } = require('json2csv');
const Student = require('../../models/Student');
const Admin = require('../../models/Admin');
const Competition = require('../../models/Competition');
const AttendanceAssignment = require('../../models/AttendanceAssignment');
const { requireAdmin, requireRoles } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { ADMIN_ROLES, COMPETITION_TYPES } = require('../../config/constants');

const router = express.Router();
router.use(requireAdmin, requireRoles(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN));

router.get('/options', asyncHandler(async (req, res) => {
  const [students, volunteers, competitions] = await Promise.all([
    Student.find().populate('department', 'name').sort({ name: 1 }).lean(),
    Admin.find({ role: ADMIN_ROLES.VOLUNTEER, isActive: true }).select('name username').sort({ name: 1 }).lean(),
    Competition.find({ type: { $in: Object.values(COMPETITION_TYPES) }, status: { $ne: 'archived' } }).select('name type').sort({ type: 1 }).lean()
  ]);
  res.json({ students, volunteers, competitions });
}));

router.get('/assignments', asyncHandler(async (req, res) => {
  const filter = req.query.competition ? { competition: req.query.competition } : {};
  const assignments = await AttendanceAssignment.find(filter)
    .populate('student', 'name rollNumber phoneNumber department')
    .populate('volunteer', 'name username')
    .populate('competition', 'name type')
    .lean();
  res.json(assignments);
}));

router.put('/assignments', asyncHandler(async (req, res) => {
  const { competitionId, studentIds = [], volunteerId } = req.body;
  if (!competitionId || !Array.isArray(studentIds) || !volunteerId) return res.status(400).json({ error: 'Competition, students, and volunteer are required' });
  const [competition, volunteer] = await Promise.all([
    Competition.findById(competitionId),
    Admin.findOne({ _id: volunteerId, role: ADMIN_ROLES.VOLUNTEER, isActive: true })
  ]);
  if (!competition || !volunteer) return res.status(400).json({ error: 'Competition or volunteer not found' });
  const operations = studentIds.map((student) => ({
    updateOne: {
      filter: { competition: competitionId, student },
      update: { $set: { competition: competitionId, student, volunteer: volunteerId, status: 'assigned' }, $setOnInsert: { checkInToken: crypto.randomBytes(18).toString('hex') } },
      upsert: true
    }
  }));
  await AttendanceAssignment.bulkWrite(operations);
  res.json(await AttendanceAssignment.find({ competition: competitionId, student: { $in: studentIds } }).populate('student', 'name rollNumber').populate('volunteer', 'name').lean());
}));

router.get('/download', asyncHandler(async (req, res) => {
  const filter = req.query.competition ? { competition: req.query.competition } : {};
  const assignments = await AttendanceAssignment.find(filter)
    .populate('student', 'name rollNumber phoneNumber')
    .populate('volunteer', 'name username')
    .populate('competition', 'name type')
    .lean();
  const rows = assignments.map((item) => ({
    Competition: item.competition?.name,
    Type: item.competition?.type,
    Student: item.student?.name,
    'Roll Number': item.student?.rollNumber,
    'Phone Number': item.phoneNumber || item.student?.phoneNumber || '',
    Volunteer: item.volunteer?.name,
    Status: item.status
  }));
  const csv = rows.length ? new Parser({ fields: Object.keys(rows[0]) }).parse(rows) : 'No attendance assignments\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance_assignments.csv"');
  res.send(csv);
}));

module.exports = router;