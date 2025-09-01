import express from 'express';
import RepositoryCache from '../models/RepositoryCache.js';

const router = express.Router();

// GET /api/cache/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await RepositoryCache.getCacheStats();
    const cacheStats = stats[0] || {
      totalEntries: 0,
      totalAccesses: 0,
      avgAccessCount: 0,
      oldestEntry: null,
      newestEntry: null
    };

    // Additional statistics
    const validEntries = await RepositoryCache.countDocuments({
      expiresAt: { $gt: new Date() }
    });

    const expiredEntries = await RepositoryCache.countDocuments({
      expiresAt: { $lte: new Date() }
    });

    // Top accessed repositories
    const topAccessed = await RepositoryCache
      .find({}, {
        fullName: 1,
        accessCount: 1,
        'data.repository.stars': 1,
        'data.repository.language': 1,
        lastAccessed: 1
      })
      .sort({ accessCount: -1 })
      .limit(5);

    res.json({
      cache: {
        ...cacheStats,
        validEntries,
        expiredEntries,
        hitRate: cacheStats.totalEntries > 0 
          ? ((cacheStats.totalAccesses / cacheStats.totalEntries) * 100).toFixed(2) 
          : 0
      },
      topAccessed: topAccessed.map(entry => ({
        name: entry.fullName,
        accessCount: entry.accessCount,
        stars: entry.data?.repository?.stars || 0,
        language: entry.data?.repository?.language,
        lastAccessed: entry.lastAccessed
      }))
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
    const result = await RepositoryCache.deleteMany({
      expiresAt: { $lte: new Date() }
    });

    res.json({
      message: 'Cache cleanup completed',
      deletedEntries: result.deletedCount,
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
    const result = await RepositoryCache.deleteMany({});
    
    res.json({
      message: 'Cache cleared successfully',
      deletedEntries: result.deletedCount,
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
    const skip = (searchPage - 1) * searchLimit;

    const searchQuery = {
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { 'data.repository.description': { $regex: q, $options: 'i' } },
        { 'data.repository.language': { $regex: q, $options: 'i' } }
      ]
    };

    const results = await RepositoryCache
      .find(searchQuery, {
        repositoryUrl: 1,
        fullName: 1,
        'data.repository.name': 1,
        'data.repository.description': 1,
        'data.repository.language': 1,
        'data.repository.stars': 1,
        'data.repository.topics': 1,
        createdAt: 1,
        accessCount: 1
      })
      .sort({ accessCount: -1, 'data.repository.stars': -1 })
      .skip(skip)
      .limit(searchLimit);

    const total = await RepositoryCache.countDocuments(searchQuery);

    res.json({
      query: q,
      results: results.map(cache => ({
        url: cache.repositoryUrl,
        name: cache.data?.repository?.name || cache.fullName,
        description: cache.data?.repository?.description,
        language: cache.data?.repository?.language,
        stars: cache.data?.repository?.stars || 0,
        topics: cache.data?.repository?.topics || [],
        analyzedAt: cache.createdAt,
        accessCount: cache.accessCount
      })),
      pagination: {
        page: searchPage,
        limit: searchLimit,
        total,
        pages: Math.ceil(total / searchLimit)
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
