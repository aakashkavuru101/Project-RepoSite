# Backend Setup Guide

## 🔧 Changes Made

This backend has been updated to remove MongoDB dependencies and use an in-memory cache instead. Here are the key changes:

### What was Fixed:
1. **✅ ES6 Imports**: Already working (package.json has `"type": "module"`)
2. **✅ MongoDB Removed**: Completely removed MongoDB and mongoose dependencies
3. **✅ In-Memory Cache**: Implemented full caching functionality without database
4. **✅ Server Startup**: Fixed and simplified server startup logic
5. **✅ Route Compatibility**: All API routes work with in-memory cache

### What was Removed:
- `mongoose` dependency from package.json
- All MongoDB connection logic
- `models/RepositoryCache.js` database model
- MongoDB environment variables

### What was Added:
- `services/cacheService.js` - Full in-memory cache implementation
- Simplified server startup without database dependencies
- Error handling for cache operations

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```

### 3. Configure GitHub API Token

**Important**: You need a real GitHub API token for the application to work properly.

#### To get a GitHub Personal Access Token:
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "RepoSite API Token"
4. Select scopes:
   - `public_repo` (for accessing public repositories)
   - `read:user` (for reading user information)
5. Copy the generated token
6. Update your `.env` file:
   ```
   GITHUB_API_TOKEN=ghp_your_actual_token_here
   ```

**Note**: The app will work without a token but with severe rate limits (60 requests/hour vs 5000 requests/hour with token).

### 4. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

All endpoints now work with in-memory caching:

- `GET /health` - Health check
- `POST /api/repository/analyze` - Analyze GitHub repository
- `GET /api/repository/status/:owner/:repo` - Check cache status
- `GET /api/repository/recent` - Get recent analyzed repositories
- `GET /api/cache/stats` - Get cache statistics
- `GET /api/cache/search` - Search cached repositories
- `DELETE /api/cache/cleanup` - Remove expired cache entries
- `DELETE /api/cache/clear` - Clear all cache

## 🧪 Testing

Test the cache service:
```bash
node test-cache.js
```

The server should start successfully and display:
```
🚀 Server running on port 5000
🌍 Environment: development
📡 CORS origin: http://localhost:3000
🔑 GitHub API: Configured  # (or "Not configured" if no token)
🔧 Database features using in-memory cache
```

## 📝 Notes

- **Performance**: In-memory cache is fast but resets when server restarts
- **Scaling**: For production with multiple servers, consider Redis
- **Memory**: Cache automatically expires entries after 24 hours
- **Graceful**: No database connection failures - always works