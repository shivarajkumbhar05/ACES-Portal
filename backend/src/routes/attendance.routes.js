const express = require('express');
const Student = require('../models/Student');
const QuizRound = require('../models/QuizRound');
const Attendance = require('../models/Attendance');
const { requireAdmin, requireRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { ADMIN_ROLES } = require('../config/constants');

const router = express.Router();
router.use(requireAdmin, requireRoles(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.ADMIN, ADMIN_ROLES.VOLUNTEER));

router.get('/', asyncHandler(async (req, res) => {
  const roundNumber = Number(req.query.round || 1);
  const round = await QuizRound.findOne({ roundNumber });
  const students = await Student.find().populate('department', 'name').sort({ name: 1 }).lean();
  const records = round ? await Attendance.find({ round: round._id }).lean() : [];
  const byStudent = new Map(records.map((item) => [item.student.toString(), item]));
  res.json(students.map((student) => ({
    id: student._id,
    name: student.name,
    rollNumber: student.rollNumber,
    phoneNumber: byStudent.get(student._id.toString())?.phoneNumber || student.phoneNumber || '',
    department: student.department?.name,
    present: byStudent.get(student._id.toString())?.present || false
  })));
}));

router.put('/', asyncHandler(async (req, res) => {
  const { studentId, roundNumber, phoneNumber, present = true } = req.body;
  const round = await QuizRound.findOne({ roundNumber: Number(roundNumber) });
  const student = await Student.findById(studentId);
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
  res.json(record);
}));

module.exports = router;
