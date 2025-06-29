const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Use Railway's provided PORT or fallback to 5001
const PORT = process.env.PORT || 5001;

// Update CORS for production
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
    // Add your Vercel domain here (you'll get this after deploying frontend)
    process.env.FRONTEND_URL || 'https://your-app-name.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

let optimizeRoutes;
try {
  optimizeRoutes = require('./routes/optimize');
  app.use('/api', optimizeRoutes);
  console.log('Optimization routes loaded successfully');
} catch (error) {
  console.log('Warning: Optimization routes not found. Create ./routes/optimize.js');
  
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'Backend server is running!', 
      timestamp: new Date().toISOString(),
      note: 'Optimization routes not yet configured',
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    });
  });
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server running', 
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'NUSAssist Backend API',
    endpoints: {
      health: '/health',
      test: '/api/test',
      optimize: '/api/optimize-timetable (when configured)'
    },
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Single server startup (Railway manages this)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});