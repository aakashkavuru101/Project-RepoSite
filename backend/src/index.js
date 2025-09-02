import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import repositoryRoutes from './routes/repository.js';
import cacheRoutes from './routes/cache.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyFunc: (req) => req.ip,
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware
app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too many requests',
      resetTime: new Date(Date.now() + rejRes.msBeforeNext)
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/repository', repositoryRoutes);
app.use('/api/cache', cacheRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details?.map(detail => detail.message) || err.message
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// MongoDB connection
const connectDB = async () => {
  // Removed MongoDB - using in-memory cache instead
  console.log('📝 Running with in-memory cache (MongoDB removed)');
  return false;
};

// Start server
const startServer = async () => {
  // Using in-memory cache instead of MongoDB
  console.log('🔧 Database features using in-memory cache');
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
    
    const hasToken = process.env.GITHUB_API_TOKEN && process.env.GITHUB_API_TOKEN.trim();
    console.log(`🔑 GitHub API: ${hasToken ? 'Configured' : 'Not configured'}`);
    
    if (!hasToken) {
      console.log('⚠️  WARNING: No GitHub API token configured!');
      console.log('   Rate limits: 60 requests/hour without token vs 5000 with token');
      console.log('   See SETUP.md for instructions to get a token');
    }
    
    console.log(`\n📋 Available endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   POST http://localhost:${PORT}/api/repository/analyze`);
    console.log(`   GET  http://localhost:${PORT}/api/cache/stats`);
    console.log(`\n✅ Backend ready! Open http://localhost:3000 for frontend\n`);
  });
};

startServer().catch(console.error);

export default app;
