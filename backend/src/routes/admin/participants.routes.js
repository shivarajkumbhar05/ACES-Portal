const express = require('express');
const Student = require('../../models/Student');
const Attempt = require('../../models/Attempt');
const { requireAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { escapeRegex } = require('../../utils/validators');

const router = express.Router();
router.use(requireAdmin);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { department, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (typeof search === 'string' && search.trim()) {
      const safeSearch = escapeRegex(search.trim().slice(0, 100));
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { rollNumber: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('department', 'name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Student.countDocuments(filter)
    ]);

    const studentIds = students.map((s) => s._id);
    const attempts = await Attempt.find({ student: { $in: studentIds } })
      .select('student roundNumber status score submittedAt')
      .lean();
    const attemptsByStudent = new Map();
    attempts.forEach((a) => {
      const key = a.student.toString();
      if (!attemptsByStudent.has(key)) attemptsByStudent.set(key, []);
      attemptsByStudent.get(key).push(a);
    });

    const items = students.map((s) => ({
      id: s._id,
      name: s.name,
      rollNumber: s.rollNumber,
      department: s.department?.name,
      attempts: attemptsByStudent.get(s._id.toString()) || []
    }));

    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  })
);

module.exports = router;
