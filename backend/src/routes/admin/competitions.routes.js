const express = require('express');
const Competition = require('../../models/Competition');
const { requireAdmin, requireSuperAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { isNonEmptyString } = require('../../utils/validators');

const router = express.Router();
router.use(requireAdmin, requireSuperAdmin);

router.get('/', asyncHandler(async (req, res) => {
  res.json(await Competition.find().sort({ createdAt: -1 }).lean());
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, description = '', date, venue = '', status = 'draft' } = req.body;
  if (!isNonEmptyString(name, 160) || !['draft', 'published', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'A competition name and valid status are required' });
  }
  const competition = await Competition.create({ name: name.trim(), description, date: date || undefined, venue, status, createdBy: req.admin._id });
  res.status(201).json(competition);
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const competition = await Competition.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!competition) return res.status(404).json({ error: 'Competition not found' });
  res.json(competition);
}));

module.exports = router;
