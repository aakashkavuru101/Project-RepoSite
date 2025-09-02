// In-memory cache service to replace MongoDB
class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      totalAccesses: 0,
      totalEntries: 0
    };
  }

  // Find valid cache entry
  findValidCache(repositoryUrl) {
    const entry = this.cache.get(repositoryUrl);
    if (!entry) return null;
    
    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(repositoryUrl);
      this.stats.totalEntries = this.cache.size;
      return null;
    }
    
    return entry;
  }

  // Update or create cache entry
  upsertCache(repositoryUrl, data) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    const existingEntry = this.cache.get(repositoryUrl);
    const accessCount = existingEntry ? existingEntry.accessCount + 1 : 1;
    
    const entry = {
      repositoryUrl,
      repositoryId: data.repository?.id,
      fullName: data.repository?.fullName,
      data,
      createdAt: existingEntry ? existingEntry.createdAt : now,
      updatedAt: now,
      expiresAt,
      accessCount,
      lastAccessed: now
    };
    
    this.cache.set(repositoryUrl, entry);
    this.stats.totalEntries = this.cache.size;
    this.stats.totalAccesses++;
    
    return entry;
  }

  // Record access to existing entry
  recordAccess(repositoryUrl) {
    const entry = this.cache.get(repositoryUrl);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = new Date();
      this.stats.totalAccesses++;
    }
    return entry;
  }

  // Get cache statistics
  getCacheStats() {
    const entries = Array.from(this.cache.values());
    const validEntries = entries.filter(entry => entry.expiresAt > new Date());
    const expiredEntries = entries.length - validEntries.length;
    
    const avgAccessCount = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + entry.accessCount, 0) / entries.length 
      : 0;
    
    const oldestEntry = entries.length > 0 
      ? Math.min(...entries.map(entry => entry.createdAt.getTime()))
      : null;
    
    const newestEntry = entries.length > 0 
      ? Math.max(...entries.map(entry => entry.createdAt.getTime()))
      : null;

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      expiredEntries,
      totalAccesses: this.stats.totalAccesses,
      avgAccessCount,
      oldestEntry: oldestEntry ? new Date(oldestEntry) : null,
      newestEntry: newestEntry ? new Date(newestEntry) : null
    };
  }

  // Get top accessed repositories
  getTopAccessed(limit = 10) {
    const entries = Array.from(this.cache.values());
    return entries
      .filter(entry => entry.expiresAt > new Date())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(entry => ({
        fullName: entry.fullName,
        accessCount: entry.accessCount,
        stars: entry.data?.repository?.stars || 0,
        language: entry.data?.repository?.language,
        lastAccessed: entry.lastAccessed
      }));
  }

  // Search repositories in cache
  searchRepositories(query, page = 1, limit = 10) {
    const entries = Array.from(this.cache.values());
    const validEntries = entries.filter(entry => entry.expiresAt > new Date());
    
    const searchQuery = query.toLowerCase();
    const filtered = validEntries.filter(entry => {
      const repo = entry.data?.repository;
      if (!repo) return false;
      
      return (
        repo.name?.toLowerCase().includes(searchQuery) ||
        repo.description?.toLowerCase().includes(searchQuery) ||
        repo.language?.toLowerCase().includes(searchQuery) ||
        repo.topics?.some(topic => topic.toLowerCase().includes(searchQuery))
      );
    });
    
    // Sort by access count and stars
    filtered.sort((a, b) => {
      const aStars = a.data?.repository?.stars || 0;
      const bStars = b.data?.repository?.stars || 0;
      if (b.accessCount !== a.accessCount) {
        return b.accessCount - a.accessCount;
      }
      return bStars - aStars;
    });
    
    const skip = (page - 1) * limit;
    const results = filtered.slice(skip, skip + limit);
    
    return {
      results: results.map(entry => ({
        url: entry.repositoryUrl,
        name: entry.data?.repository?.name || entry.fullName,
        description: entry.data?.repository?.description,
        language: entry.data?.repository?.language,
        stars: entry.data?.repository?.stars || 0,
        topics: entry.data?.repository?.topics || [],
        analyzedAt: entry.createdAt,
        accessCount: entry.accessCount
      })),
      total: filtered.length,
      page,
      limit,
      pages: Math.ceil(filtered.length / limit)
    };
  }

  // Get recent repositories
  getRecentRepositories(page = 1, limit = 10) {
    const entries = Array.from(this.cache.values());
    const validEntries = entries.filter(entry => entry.expiresAt > new Date());
    
    // Sort by creation date (most recent first)
    validEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const skip = (page - 1) * limit;
    const results = validEntries.slice(skip, skip + limit);
    
    return {
      results: results.map(entry => ({
        repositoryUrl: entry.repositoryUrl,
        fullName: entry.fullName,
        name: entry.data?.repository?.name,
        description: entry.data?.repository?.description,
        language: entry.data?.repository?.language,
        stars: entry.data?.repository?.stars || 0,
        createdAt: entry.createdAt,
        accessCount: entry.accessCount
      })),
      total: validEntries.length,
      page,
      limit,
      pages: Math.ceil(validEntries.length / limit)
    };
  }

  // Clean up expired entries
  cleanupExpired() {
    const now = new Date();
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    this.stats.totalEntries = this.cache.size;
    return deletedCount;
  }

  // Clear all cache
  clear() {
    const deletedCount = this.cache.size;
    this.cache.clear();
    this.stats.totalEntries = 0;
    return deletedCount;
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;