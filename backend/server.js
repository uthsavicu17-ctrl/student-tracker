const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { initDatabase } = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const subjectsRoutes = require('./routes/subjects');
const sectionsRoutes = require('./routes/sections');
const attendanceRoutes = require('./routes/attendance');
const assessmentsRoutes = require('./routes/assessments');
const studentsRoutes = require('./routes/students');
const statsRoutes = require('./routes/stats');
const correctionsRoutes = require('./routes/corrections');
const uciRoutes = require('./routes/uci');

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/corrections', correctionsRoutes);
app.use('/api/uci', uciRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EduTrack API',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend dist assets if available
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Initialize database and start server
async function startServer(port = PORT) {
  try {
    await initDatabase();
    const server = app.listen(port, () => {
      console.log(`EduTrack API server running on http://localhost:${port}`);
      console.log(`Health check: http://localhost:${port}/api/health`);
    });
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
