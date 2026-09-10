const express = require('express');
const Qualification = require('../../models/Qualification');
const AuditLog = require('../../models/AuditLog');
const { requireAdmin, requireSuperAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const {
  computeRound2Qualification,
  finalizeRound2Qualification
} = require('../../services/qualification.service');
const { isValidObjectId } = require('../../utils/validators');

const router = express.Router();
router.use(requireAdmin);

/** GET /api/admin/qualification/round2 - department-wise Top 5 preview (or finalized list). */
router.get(
  '/round2',
  asyncHandler(async (req, res) => {
    const results = await computeRound2Qualification({ fromRound: 1, forRound: 2 });
    const shaped = results.map((r) => ({
      department: { id: r.department._id, name: r.department.name },
      finalized: r.finalized,
      qualifiers: r.qualifiers.map((q, i) => ({
        rank: q.rank,
        studentName: q.student.name,
        rollNumber: q.student.rollNumber,
        score: q.score,
        timeTakenSeconds: q.timeTakenSeconds,
        tieBreakReason: q.tieBreakReason,
        qualified: q.qualified
      }))
    }));
    res.json(shaped);
  })
);

/** POST /api/admin/qualification/round2/finalize - lock in the selection. */
router.post(
  '/round2/finalize',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { departmentId } = req.body;
    if (departmentId && !isValidObjectId(departmentId)) {
      return res.status(400).json({ error: 'Invalid department id' });
    }

    const result = await finalizeRound2Qualification({
      forRound: 2,
      departmentId: departmentId || null,
      adminId: req.admin._id
    });

    await AuditLog.create({
      admin: req.admin._id,
      action: 'round2.finalize',
      details: { departmentId: departmentId || 'all' },
      ipAddress: req.ip
    });

    res.json({ modified: result.modifiedCount });
  })
);

/** PUT /api/admin/qualification/round2/:id - manual override for unresolved ties. */
router.put(
  '/round2/:id',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid qualification id' });
    const { qualified } = req.body;
    if (typeof qualified !== 'boolean') return res.status(400).json({ error: 'qualified must be true or false' });

    const record = await Qualification.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Qualification record not found' });
    if (record.finalized) {
      return res.status(409).json({ error: 'This selection is already finalized. Unlock it first via a super admin action.' });
    }

    record.qualified = qualified;
    record.manuallyResolved = true;
    record.resolvedBy = req.admin._id;
    await record.save();

    await AuditLog.create({
      admin: req.admin._id,
      action: 'round2.manual_override',
      details: { qualificationId: record._id, qualified },
      ipAddress: req.ip
    });

    res.json(record);
  })
);

/** POST /api/admin/qualification/round2/unlock - super admin only: reopen a finalized department. */
router.post(
  '/round2/unlock',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { departmentId } = req.body;
    const filter = { forRound: 2, finalized: true };
    if (departmentId) filter.department = departmentId;

    const result = await Qualification.updateMany(filter, { $set: { finalized: false } });

    await AuditLog.create({
      admin: req.admin._id,
      action: 'round2.unlock',
      details: { departmentId: departmentId || 'all' },
      ipAddress: req.ip
    });

    res.json({ modified: result.modifiedCount });
  })
);

module.exports = router;
