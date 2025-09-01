import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
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
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reposite';
    
    // Set a shorter timeout for MongoDB connection
    await Promise.race([
      mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 5000,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 5000)
      )
    ]);
    
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.warn('⚠️ MongoDB connection failed:', error.message);
    console.log('📝 Running without database caching...');
    return false;
  }
};

// Start server
const startServer = async () => {
  const mongoConnected = await connectDB();
  
  if (!mongoConnected) {
    // Disable MongoDB-dependent routes if connection failed
    console.log('🔧 Database features disabled - running in memory only mode');
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
    console.log(`🔑 GitHub API: ${process.env.GITHUB_TOKEN ? 'Configured' : 'Not configured'}`);
  });
};

startServer().catch(console.error);

export default app;
