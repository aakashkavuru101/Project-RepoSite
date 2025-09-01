import mongoose from 'mongoose';

const repositoryCacheSchema = new mongoose.Schema({
  repositoryUrl: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  repositoryId: {
    type: Number,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    index: { expireAfterSeconds: 0 }
  },
  accessCount: {
    type: Number,
    default: 1
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
repositoryCacheSchema.index({ repositoryUrl: 1, expiresAt: 1 });
repositoryCacheSchema.index({ fullName: 1 });
repositoryCacheSchema.index({ createdAt: -1 });

// Update access tracking
repositoryCacheSchema.methods.recordAccess = function() {
  this.accessCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// Check if cache is still valid
repositoryCacheSchema.methods.isValid = function() {
  return this.expiresAt > new Date();
};

// Static method to find valid cache
repositoryCacheSchema.statics.findValidCache = function(repositoryUrl) {
  return this.findOne({
    repositoryUrl,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to get cache statistics
repositoryCacheSchema.statics.getCacheStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        totalAccesses: { $sum: '$accessCount' },
        avgAccessCount: { $avg: '$accessCount' },
        oldestEntry: { $min: '$createdAt' },
        newestEntry: { $max: '$createdAt' }
      }
    }
  ]);
};

// Pre-save middleware to update timestamps
repositoryCacheSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

const RepositoryCache = mongoose.model('RepositoryCache', repositoryCacheSchema);

export default RepositoryCache;
