const express = require('express');
const dashboardRoutes = require('./dashboard.routes');
const questionsRoutes = require('./questions.routes');
const uploadRoutes = require('./upload.routes');
const settingsRoutes = require('./settings.routes');
const resultsRoutes = require('./results.routes');
const qualificationRoutes = require('./qualification.routes');
const participantsRoutes = require('./participants.routes');
const reportsRoutes = require('./reports.routes');
const competitionsRoutes = require('./competitions.routes');
const attendanceRoutes = require('./attendance.routes');
const controlRoomRoutes = require('./control-room.routes');

const router = express.Router();

router.use('/dashboard', dashboardRoutes);
router.use('/questions', questionsRoutes);
router.use('/upload', uploadRoutes);
router.use('/rounds', settingsRoutes);
router.use('/results', resultsRoutes);
router.use('/qualification', qualificationRoutes);
router.use('/participants', participantsRoutes);
router.use('/reports', reportsRoutes);
router.use('/competitions', competitionsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/control-room', controlRoomRoutes);

module.exports = router;
