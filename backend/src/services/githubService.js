import axios from 'axios';
import { marked } from 'marked';
import * as cheerio from 'cheerio';

class GitHubService {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000
    });
    
    // Set up request interceptor to add auth header dynamically
    this.client.interceptors.request.use((config) => {
      const token = process.env.GITHUB_TOKEN;
      config.headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'RepoSite-Portfolio-Generator',
        ...(token && { 'Authorization': `token ${token}` }),
        ...config.headers
      };
      
      // Log token status only on first request
      if (!this._tokenLogged) {
        console.log('🔑 GitHub API token:', token ? 'Loaded successfully' : 'Not found');
        this._tokenLogged = true;
      }
      
      return config;
    });
  }

  // Parse GitHub URL to extract owner and repo
  parseGitHubUrl(url) {
    const patterns = [
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    }
    
    throw new Error('Invalid GitHub URL format');
  }

  // Get repository information
  async getRepository(owner, repo) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Repository not found');
      }
      if (error.response?.status === 403) {
        throw new Error('Repository access forbidden');
      }
      throw new Error(`Failed to fetch repository: ${error.message}`);
    }
  }

  // Get repository README
  async getReadme(owner, repo) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/readme`);
      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      return {
        content,
        html: marked(content),
        filename: response.data.name
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // No README found
      }
      throw new Error(`Failed to fetch README: ${error.message}`);
    }
  }

  // Get repository languages
  async getLanguages(owner, repo) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/languages`);
      const languages = response.data;
      
      const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
      const languageStats = Object.entries(languages).map(([name, bytes]) => ({
        name,
        bytes,
        percentage: ((bytes / total) * 100).toFixed(1)
      })).sort((a, b) => b.bytes - a.bytes);
      
      return {
        raw: languages,
        stats: languageStats,
        primary: languageStats[0]?.name || 'Unknown'
      };
    } catch (error) {
      console.warn(`Failed to fetch languages for ${owner}/${repo}:`, error.message);
      return { raw: {}, stats: [], primary: 'Unknown' };
    }
  }

  // Get repository contents (for tech stack detection)
  async getContents(owner, repo, path = '') {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch contents at ${path}:`, error.message);
      return [];
    }
  }

  // Detect tech stack from repository
  async detectTechStack(owner, repo) {
    const techStack = {
      frontend: [],
      backend: [],
      database: [],
      tools: [],
      frameworks: []
    };

    try {
      // Get root directory contents
      const contents = await this.getContents(owner, repo);
      const files = contents.filter(item => item.type === 'file').map(item => item.name);
      
      // Package managers and config files
      const packageFiles = {
        'package.json': 'Node.js',
        'requirements.txt': 'Python',
        'Pipfile': 'Python',
        'Gemfile': 'Ruby',
        'pom.xml': 'Java',
        'build.gradle': 'Java',
        'Cargo.toml': 'Rust',
        'go.mod': 'Go',
        'composer.json': 'PHP',
        'pubspec.yaml': 'Dart/Flutter'
      };

      // Framework detection files
      const frameworkFiles = {
        'angular.json': 'Angular',
        'nuxt.config.js': 'Nuxt.js',
        'next.config.js': 'Next.js',
        'gatsby-config.js': 'Gatsby',
        'vue.config.js': 'Vue.js',
        'svelte.config.js': 'Svelte',
        'astro.config.mjs': 'Astro'
      };

      // Tool detection
      const toolFiles = {
        'Dockerfile': 'Docker',
        'docker-compose.yml': 'Docker Compose',
        'webpack.config.js': 'Webpack',
        'vite.config.js': 'Vite',
        'tailwind.config.js': 'Tailwind CSS',
        'postcss.config.js': 'PostCSS',
        '.eslintrc': 'ESLint',
        'tsconfig.json': 'TypeScript'
      };

      // Check for files
      files.forEach(file => {
        if (packageFiles[file]) {
          techStack.backend.push(packageFiles[file]);
        }
        if (frameworkFiles[file]) {
          techStack.frameworks.push(frameworkFiles[file]);
        }
        if (toolFiles[file]) {
          techStack.tools.push(toolFiles[file]);
        }
      });

      // Analyze package.json if present
      if (files.includes('package.json')) {
        try {
          const packageJson = await this.getContents(owner, repo, 'package.json');
          const content = Buffer.from(packageJson.content, 'base64').toString('utf8');
          const pkg = JSON.parse(content);
          
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          
          // Frontend frameworks
          if (deps.react) techStack.frontend.push('React');
          if (deps.vue) techStack.frontend.push('Vue.js');
          if (deps['@angular/core']) techStack.frontend.push('Angular');
          if (deps.svelte) techStack.frontend.push('Svelte');
          
          // Backend frameworks
          if (deps.express) techStack.backend.push('Express.js');
          if (deps.fastify) techStack.backend.push('Fastify');
          if (deps.koa) techStack.backend.push('Koa.js');
          if (deps.nestjs) techStack.backend.push('NestJS');
          
          // Databases
          if (deps.mongoose) techStack.database.push('MongoDB');
          if (deps.mysql2) techStack.database.push('MySQL');
          if (deps.pg) techStack.database.push('PostgreSQL');
          if (deps.sqlite3) techStack.database.push('SQLite');
          if (deps.redis) techStack.database.push('Redis');
          
        } catch (error) {
          console.warn('Failed to parse package.json:', error.message);
        }
      }

      // Remove duplicates
      Object.keys(techStack).forEach(key => {
        techStack[key] = [...new Set(techStack[key])];
      });

      return techStack;
    } catch (error) {
      console.warn(`Failed to detect tech stack for ${owner}/${repo}:`, error.message);
      return techStack;
    }
  }

  // Extract features from README
  extractFeatures(readmeContent) {
    if (!readmeContent) return [];
    
    const features = [];
    const lines = readmeContent.split('\n');
    
    let inFeatureSection = false;
    const featureIndicators = ['features', 'functionality', 'capabilities', 'what it does'];
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      
      // Check if we're entering a features section
      if (featureIndicators.some(indicator => 
        lowerLine.includes(indicator) && (lowerLine.includes('#') || lowerLine.includes('**'))
      )) {
        inFeatureSection = true;
        return;
      }
      
      // Check if we're leaving the features section
      if (inFeatureSection && line.startsWith('#') && !featureIndicators.some(indicator => 
        lowerLine.includes(indicator)
      )) {
        inFeatureSection = false;
        return;
      }
      
      // Extract feature if we're in the section
      if (inFeatureSection) {
        const bulletMatch = line.match(/^[\s]*[-*+]\s+(.+)/);
        const numberMatch = line.match(/^[\s]*\d+\.\s+(.+)/);
        
        if (bulletMatch) {
          features.push(bulletMatch[1].trim());
        } else if (numberMatch) {
          features.push(numberMatch[1].trim());
        }
      }
    });
    
    return features.slice(0, 10); // Limit to 10 features
  }

  // Get repository analytics
  async getAnalytics(owner, repo) {
    try {
      const [commits, contributors, releases] = await Promise.allSettled([
        this.client.get(`/repos/${owner}/${repo}/commits?per_page=1`),
        this.client.get(`/repos/${owner}/${repo}/contributors`),
        this.client.get(`/repos/${owner}/${repo}/releases`)
      ]);

      return {
        commitCount: commits.status === 'fulfilled' ? 
          parseInt(commits.value.headers.link?.match(/page=(\d+)>; rel="last"/)?.[1]) || 1 : 0,
        contributorCount: contributors.status === 'fulfilled' ? contributors.value.data.length : 0,
        releaseCount: releases.status === 'fulfilled' ? releases.value.data.length : 0
      };
    } catch (error) {
      console.warn(`Failed to get analytics for ${owner}/${repo}:`, error.message);
      return { commitCount: 0, contributorCount: 0, releaseCount: 0 };
    }
  }

  // Main analysis method
  async analyzeRepository(url) {
    const { owner, repo } = this.parseGitHubUrl(url);
    
    console.log(`🔍 Analyzing repository: ${owner}/${repo}`);
    
    try {
      // Fetch all repository data in parallel
      const [repository, readme, languages, techStack, analytics] = await Promise.allSettled([
        this.getRepository(owner, repo),
        this.getReadme(owner, repo),
        this.getLanguages(owner, repo),
        this.detectTechStack(owner, repo),
        this.getAnalytics(owner, repo)
      ]);

      if (repository.status === 'rejected') {
        throw repository.reason;
      }

      const repoData = repository.value;
      const readmeData = readme.status === 'fulfilled' ? readme.value : null;
      const languageData = languages.status === 'fulfilled' ? languages.value : { stats: [], primary: 'Unknown' };
      const techStackData = techStack.status === 'fulfilled' ? techStack.value : {};
      const analyticsData = analytics.status === 'fulfilled' ? analytics.value : {};

      const result = {
        repository: {
          id: repoData.id,
          name: repoData.name,
          fullName: repoData.full_name,
          owner: {
            login: repoData.owner.login,
            avatar: repoData.owner.avatar_url,
            type: repoData.owner.type
          },
          description: repoData.description,
          url: repoData.html_url,
          cloneUrl: repoData.clone_url,
          homepage: repoData.homepage,
          topics: repoData.topics || [],
          language: repoData.language,
          size: repoData.size,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          watchers: repoData.watchers_count,
          openIssues: repoData.open_issues_count,
          createdAt: repoData.created_at,
          updatedAt: repoData.updated_at,
          pushedAt: repoData.pushed_at,
          license: repoData.license?.name || null,
          isPrivate: repoData.private,
          isFork: repoData.fork,
          archived: repoData.archived
        },
        readme: readmeData,
        languages: languageData,
        techStack: techStackData,
        analytics: analyticsData,
        features: readmeData ? this.extractFeatures(readmeData.content) : [],
        analysis: {
          complexity: this.calculateComplexity(languageData, techStackData),
          category: this.categorizeProject(repoData, techStackData),
          deployability: this.assessDeployability(techStackData),
          score: this.calculateProjectScore(repoData, analyticsData)
        },
        generatedAt: new Date().toISOString()
      };

      console.log(`✅ Analysis completed for ${owner}/${repo}`);
      return result;

    } catch (error) {
      console.error(`❌ Analysis failed for ${owner}/${repo}:`, error.message);
      throw error;
    }
  }

  // Helper methods for analysis
  calculateComplexity(languages, techStack) {
    let score = 0;
    score += languages.stats.length * 10;
    score += Object.values(techStack).flat().length * 5;
    
    if (score < 30) return 'Simple';
    if (score < 60) return 'Moderate';
    return 'Complex';
  }

  categorizeProject(repo, techStack) {
    const frontend = techStack.frontend || [];
    const backend = techStack.backend || [];
    const tools = techStack.tools || [];
    
    if (frontend.length > 0 && backend.length > 0) return 'Full-Stack Application';
    if (frontend.length > 0) return 'Frontend Application';
    if (backend.length > 0) return 'Backend Service';
    if (tools.includes('Docker')) return 'DevOps/Infrastructure';
    if (repo.language === 'Python') return 'Python Project';
    if (repo.language === 'JavaScript') return 'JavaScript Project';
    
    return 'General Project';
  }

  assessDeployability(techStack) {
    const deployableFrameworks = ['React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Gatsby'];
    const hasDeployableFramework = deployableFrameworks.some(framework => 
      techStack.frontend?.includes(framework) || techStack.frameworks?.includes(framework)
    );
    
    if (hasDeployableFramework || techStack.tools?.includes('Docker')) {
      return 'High';
    }
    
    if (techStack.backend?.length > 0) {
      return 'Medium';
    }
    
    return 'Low';
  }

  calculateProjectScore(repo, analytics) {
    let score = 0;
    
    // Stars weight (max 40 points)
    score += Math.min(repo.stargazers_count / 10, 40);
    
    // Forks weight (max 20 points)
    score += Math.min(repo.forks_count / 5, 20);
    
    // Recent activity (max 20 points)
    const daysSinceUpdate = (new Date() - new Date(repo.updated_at)) / (1000 * 60 * 60 * 24);
    score += Math.max(20 - daysSinceUpdate / 7, 0);
    
    // Contributors (max 10 points)
    score += Math.min(analytics.contributorCount * 2, 10);
    
    // Documentation (max 10 points)
    if (repo.description) score += 5;
    if (repo.homepage) score += 5;
    
    return Math.round(Math.min(score, 100));
  }
}

export default new GitHubService();
