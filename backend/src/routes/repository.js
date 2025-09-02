import express from 'express';
import Joi from 'joi';
import GitHubService from '../services/githubService.js';
import RepositoryCache from '../models/RepositoryCache.js';

const router = express.Router();

// Validation schema
const analyzeSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'Please provide a valid URL',
    'any.required': 'Repository URL is required'
  }),
  forceRefresh: Joi.boolean().default(false)
});

// POST /api/repository/analyze
router.post('/analyze', async (req, res) => {
  try {
    // Validate input
    const { error, value } = analyzeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { url, forceRefresh } = value;

    // Normalize URL
    const normalizedUrl = url.trim().toLowerCase()
      .replace(/\.git$/, '')
      .replace(/\/$/, '');

    console.log(`📥 Repository analysis request: ${normalizedUrl}`);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      try {
        const cachedData = await RepositoryCache.findValidCache(normalizedUrl);
        if (cachedData) {
          console.log(`⚡ Cache hit for: ${normalizedUrl}`);
          await cachedData.recordAccess();
          
          return res.json({
            data: cachedData.data,
            cached: true,
            cacheAge: Date.now() - cachedData.createdAt.getTime(),
            accessCount: cachedData.accessCount
          });
        }
      } catch (cacheError) {
        console.warn('⚠️ Cache check failed (running without database):', cacheError.message);
      }
    }

    // Analyze repository
    console.log(`🔍 Analyzing repository: ${normalizedUrl}`);
    const analysisData = await GitHubService.analyzeRepository(normalizedUrl);

    // Cache the results
    try {
      await RepositoryCache.findOneAndUpdate(
        { repositoryUrl: normalizedUrl },
        {
          repositoryUrl: normalizedUrl,
          repositoryId: analysisData.repository.id,
          fullName: analysisData.repository.fullName,
          data: analysisData,
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          $inc: { accessCount: 1 },
          lastAccessed: new Date()
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );
      console.log(`💾 Cached analysis for: ${normalizedUrl}`);
    } catch (cacheError) {
      console.warn('⚠️ Failed to cache results (running without database):', cacheError.message);
      // Continue without caching
    }

    res.json({
      data: analysisData,
      cached: false,
      analysisTime: Date.now() - req.startTime || 0
    });

  } catch (error) {
    console.error('❌ Repository analysis error:', error);
    
    // Handle specific GitHub errors
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Repository not found',
        message: 'The specified repository does not exist or is not public'
      });
    }
    
    if (error.message.includes('access forbidden')) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'Unable to access this repository. It may be private or restricted'
      });
    }
    
    if (error.message.includes('Invalid GitHub URL')) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid GitHub repository URL'
      });
    }

    res.status(500).json({
      error: 'Analysis failed',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to analyze repository at this time' 
        : error.message
    });
  }
});

// GET /api/repository/status/:owner/:repo
router.get('/status/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repositoryUrl = `https://github.com/${owner}/${repo}`;
    
    const cachedData = await RepositoryCache.findValidCache(repositoryUrl);
    
    if (cachedData) {
      res.json({
        cached: true,
        lastAnalyzed: cachedData.createdAt,
        expiresAt: cachedData.expiresAt,
        accessCount: cachedData.accessCount,
        isExpired: !cachedData.isValid()
      });
    } else {
      res.json({
        cached: false,
        lastAnalyzed: null
      });
    }
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Failed to check status'
    });
  }
});

// GET /api/repository/recent
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const recent = await RepositoryCache
      .find({}, {
        repositoryUrl: 1,
        fullName: 1,
        'data.repository.name': 1,
        'data.repository.description': 1,
        'data.repository.language': 1,
        'data.repository.stars': 1,
        createdAt: 1,
        accessCount: 1
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await RepositoryCache.countDocuments();

    res.json({
      repositories: recent.map(cache => ({
        url: cache.repositoryUrl,
        name: cache.data?.repository?.name || cache.fullName,
        description: cache.data?.repository?.description,
        language: cache.data?.repository?.language,
        stars: cache.data?.repository?.stars,
        analyzedAt: cache.createdAt,
        accessCount: cache.accessCount
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Recent repositories error:', error);
    res.status(500).json({
      error: 'Failed to fetch recent repositories'
    });
  }
});

// DELETE /api/repository/cache/:owner/:repo
router.delete('/cache/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repositoryUrl = `https://github.com/${owner}/${repo}`;
    
    const result = await RepositoryCache.findOneAndDelete({ repositoryUrl });
    
    if (result) {
      res.json({
        message: 'Cache cleared successfully',
        clearedEntry: {
          fullName: result.fullName,
          lastAnalyzed: result.createdAt
        }
      });
    } else {
      res.status(404).json({
        error: 'Cache entry not found'
      });
    }
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache'
    });
  }
});

// Middleware to track request timing
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

export default router;
