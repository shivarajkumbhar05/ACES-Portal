const express = require('express');
const Competition = require('../../models/Competition');
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

router.post('/:id/publish-results', asyncHandler(async (req, res) => {
  const competition = await Competition.findByIdAndUpdate(req.params.id, { resultsPublished: true, resultsPublishedAt: new Date() }, { new: true });
  if (!competition) return res.status(404).json({ error: 'Competition not found' });
  res.json(competition);
}));

module.exports = router;
