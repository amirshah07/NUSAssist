const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORTS = [5001, 5000, 5002, 8000, 8080];

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173'
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
      port: res.locals.port || 'unknown'
    });
  });
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server running', 
    timestamp: new Date().toISOString(),
    port: res.locals.port || 'unknown'
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
    port: res.locals.port || 'unknown'
  });
});

function startServer(portIndex = 0) {
  if (portIndex >= PORTS.length) {
    console.error('All ports are in use. Please free up a port or restart your computer.');
    process.exit(1);
  }

  const PORT = PORTS[portIndex];
  
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`Full API: http://localhost:${PORT}/`);
    console.log(`CORS enabled for frontend ports: 3000, 3001, 5173, 4173`);
    
    app.use((req, res, next) => {
      res.locals.port = PORT;
      next();
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is busy, trying next port...`);
      startServer(portIndex + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
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
}

startServer();