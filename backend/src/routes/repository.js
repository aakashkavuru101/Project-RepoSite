import express from 'express';
import Joi from 'joi';
import GitHubService from '../services/githubService.js';
import cacheService from '../services/cacheService.js';

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
      const cachedData = cacheService.findValidCache(normalizedUrl);
      if (cachedData) {
        console.log(`⚡ Cache hit for: ${normalizedUrl}`);
        cacheService.recordAccess(normalizedUrl);
        
        return res.json({
          data: cachedData.data,
          cached: true,
          cacheAge: Date.now() - cachedData.createdAt.getTime(),
          accessCount: cachedData.accessCount
        });
      }
    }

    // Analyze repository
    console.log(`🔍 Analyzing repository: ${normalizedUrl}`);
    const analysisData = await GitHubService.analyzeRepository(normalizedUrl);

    // Cache the results
    const cachedEntry = cacheService.upsertCache(normalizedUrl, analysisData);
    console.log(`💾 Cached analysis for: ${normalizedUrl}`);

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
    
    const cachedData = cacheService.findValidCache(repositoryUrl);
    
    if (cachedData) {
      res.json({
        cached: true,
        lastAnalyzed: cachedData.createdAt,
        expiresAt: cachedData.expiresAt,
        accessCount: cachedData.accessCount,
        isExpired: cachedData.expiresAt < new Date()
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

    const result = cacheService.getRecentRepositories(page, limit);

    res.json({
      repositories: result.results,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
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
