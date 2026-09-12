const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { getCorsOptions } = require('./config/cors');

const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const quizRoutes = require('./routes/quiz.routes');
const adminRoutes = require('./routes/admin/index');
const staffRoutes = require('./routes/staff.routes');
const judgingRoutes = require('./routes/judging.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  const trustProxy = process.env.TRUST_PROXY;
  app.set('trust proxy', trustProxy ? Number(trustProxy) || trustProxy === 'true' : false);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  app.use(
    cors({
      ...getCorsOptions()
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(mongoSanitize()); // strips $ and . from user input to block NoSQL injection

  app.get('/api/health', (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/quiz', quizRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/judging', judgingRoutes);
  app.use('/api/attendance', attendanceRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
