import express from 'express';
import cacheService from '../services/cacheService.js';

const router = express.Router();

// GET /api/cache/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = cacheService.getCacheStats();
    const topAccessed = cacheService.getTopAccessed(5);

    res.json({
      cache: {
        ...stats,
        hitRate: stats.totalEntries > 0 
          ? ((stats.totalAccesses / stats.totalEntries) * 100).toFixed(2) 
          : 0
      },
      topAccessed
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve cache statistics'
    });
  }
});

// DELETE /api/cache/cleanup
router.delete('/cleanup', async (req, res) => {
  try {
    // Remove expired entries
    const deletedCount = cacheService.cleanupExpired();

    res.json({
      message: 'Cache cleanup completed',
      deletedEntries: deletedCount,
      cleanupTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache cleanup error:', error);
    res.status(500).json({
      error: 'Failed to cleanup cache'
    });
  }
});

// DELETE /api/cache/clear
router.delete('/clear', async (req, res) => {
  try {
    const deletedCount = cacheService.clear();
    
    res.json({
      message: 'Cache cleared successfully',
      deletedEntries: deletedCount,
      clearTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache'
    });
  }
});

// GET /api/cache/search
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    const searchLimit = Math.min(parseInt(limit), 50);
    const searchPage = Math.max(parseInt(page), 1);

    const result = cacheService.searchRepositories(q, searchPage, searchLimit);

    res.json({
      query: q,
      results: result.results,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    });
  } catch (error) {
    console.error('Cache search error:', error);
    res.status(500).json({
      error: 'Failed to search cache'
    });
  }
});

export default router;
