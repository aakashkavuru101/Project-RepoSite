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

  // Mock data for demonstration
  getMockRepositoryData(owner, repo) {
    const mockRepos = {
      'facebook/react': {
        id: 10270250,
        name: 'react',
        full_name: 'facebook/react',
        owner: {
          login: 'facebook',
          avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4',
          type: 'Organization'
        },
        description: 'The library for web and native user interfaces.',
        html_url: 'https://github.com/facebook/react',
        clone_url: 'https://github.com/facebook/react.git',
        homepage: 'https://react.dev',
        topics: ['declarative', 'frontend', 'javascript', 'library', 'react', 'ui'],
        language: 'JavaScript',
        size: 198000,
        stargazers_count: 228000,
        forks_count: 46800,
        watchers_count: 228000,
        open_issues_count: 1024,
        created_at: '2013-05-24T16:15:54Z',
        updated_at: '2024-12-01T12:00:00Z',
        pushed_at: '2024-12-01T11:30:00Z',
        license: { name: 'MIT License' },
        private: false,
        fork: false,
        archived: false
      },
      'microsoft/vscode': {
        id: 41881900,
        name: 'vscode',
        full_name: 'microsoft/vscode',
        owner: {
          login: 'microsoft',
          avatar_url: 'https://avatars.githubusercontent.com/u/6154722?v=4',
          type: 'Organization'
        },
        description: 'Visual Studio Code',
        html_url: 'https://github.com/microsoft/vscode',
        clone_url: 'https://github.com/microsoft/vscode.git',
        homepage: 'https://code.visualstudio.com',
        topics: ['editor', 'electron', 'microsoft', 'typescript', 'vscode'],
        language: 'TypeScript',
        size: 500000,
        stargazers_count: 163000,
        forks_count: 28900,
        watchers_count: 163000,
        open_issues_count: 6543,
        created_at: '2015-09-03T20:23:16Z',
        updated_at: '2024-12-01T12:00:00Z',
        pushed_at: '2024-12-01T11:45:00Z',
        license: { name: 'MIT License' },
        private: false,
        fork: false,
        archived: false
      }
    };

    const defaultRepo = {
      id: Math.floor(Math.random() * 100000000),
      name: repo,
      full_name: `${owner}/${repo}`,
      owner: {
        login: owner,
        avatar_url: `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 100000)}?v=4`,
        type: 'User'
      },
      description: `A great ${repo} project by ${owner}`,
      html_url: `https://github.com/${owner}/${repo}`,
      clone_url: `https://github.com/${owner}/${repo}.git`,
      homepage: '',
      topics: ['project', 'github'],
      language: 'JavaScript',
      size: Math.floor(Math.random() * 50000),
      stargazers_count: Math.floor(Math.random() * 1000),
      forks_count: Math.floor(Math.random() * 200),
      watchers_count: Math.floor(Math.random() * 1000),
      open_issues_count: Math.floor(Math.random() * 50),
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2024-12-01T12:00:00Z',
      pushed_at: '2024-12-01T10:00:00Z',
      license: { name: 'MIT License' },
      private: false,
      fork: false,
      archived: false
    };

    return mockRepos[`${owner}/${repo}`] || defaultRepo;
  }

  // Get repository information (mocked for demo)
  async getRepository(owner, repo) {
    try {
      // First try real API
      const response = await this.client.get(`/repos/${owner}/${repo}`);
      return response.data;
    } catch (error) {
      console.log(`📝 Using mock data for ${owner}/${repo} (API unavailable)`);
      return this.getMockRepositoryData(owner, repo);
    }
  }

  // Get repository README (mocked)
  async getReadme(owner, repo) {
    const mockReadmes = {
      'facebook/react': {
        content: `# React\n\nThe library for web and native user interfaces.\n\n## Features\n\n- Component-Based Architecture\n- Virtual DOM for Performance\n- Declarative UI Programming\n- Large Ecosystem and Community\n- Server-Side Rendering Support\n\n## Installation\n\n\`\`\`bash\nnpm install react\n\`\`\`\n\n## Usage\n\n\`\`\`jsx\nimport React from 'react';\n\nfunction App() {\n  return <h1>Hello World!</h1>;\n}\n\nexport default App;\n\`\`\``,
        html: '<h1>React</h1><p>The library for web and native user interfaces.</p>',
        filename: 'README.md'
      }
    };

    const defaultReadme = {
      content: `# ${repo}\n\n${this.getMockRepositoryData(owner, repo).description}\n\n## Features\n\n- Modern architecture\n- Easy to use\n- Well documented\n- Active community\n\n## Installation\n\n\`\`\`bash\ngit clone https://github.com/${owner}/${repo}.git\n\`\`\`\n\n## Usage\n\nSee documentation for usage instructions.`,
      html: `<h1>${repo}</h1><p>${this.getMockRepositoryData(owner, repo).description}</p>`,
      filename: 'README.md'
    };

    return mockReadmes[`${owner}/${repo}`] || defaultReadme;
  }

  // Get repository languages (mocked)
  async getLanguages(owner, repo) {
    const mockLanguages = {
      'facebook/react': {
        'JavaScript': 2650000,
        'TypeScript': 450000,
        'CSS': 25000,
        'HTML': 15000
      },
      'microsoft/vscode': {
        'TypeScript': 12500000,
        'JavaScript': 850000,
        'CSS': 125000,
        'Python': 45000
      }
    };

    const defaultLanguages = {
      'JavaScript': 1000000,
      'TypeScript': 200000,
      'CSS': 50000
    };

    const languages = mockLanguages[`${owner}/${repo}`] || defaultLanguages;
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
  }

  // Detect tech stack (mocked)
  async detectTechStack(owner, repo) {
    const mockTechStacks = {
      'facebook/react': {
        frontend: ['React'],
        backend: ['Node.js'],
        database: [],
        tools: ['Webpack', 'Babel', 'ESLint'],
        frameworks: ['React']
      },
      'microsoft/vscode': {
        frontend: ['Electron'],
        backend: ['Node.js'],
        database: [],
        tools: ['TypeScript', 'Webpack'],
        frameworks: ['Electron']
      }
    };

    return mockTechStacks[`${owner}/${repo}`] || {
      frontend: ['React'],
      backend: ['Node.js'],
      database: ['MongoDB'],
      tools: ['Webpack', 'ESLint'],
      frameworks: ['Express.js']
    };
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
      
      if (featureIndicators.some(indicator => 
        lowerLine.includes(indicator) && (lowerLine.includes('#') || lowerLine.includes('**'))
      )) {
        inFeatureSection = true;
        return;
      }
      
      if (inFeatureSection && line.startsWith('#') && !featureIndicators.some(indicator => 
        lowerLine.includes(indicator)
      )) {
        inFeatureSection = false;
        return;
      }
      
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
    
    return features.slice(0, 10);
  }

  // Get repository analytics (mocked)
  async getAnalytics(owner, repo) {
    return {
      commitCount: Math.floor(Math.random() * 5000) + 100,
      contributorCount: Math.floor(Math.random() * 50) + 5,
      releaseCount: Math.floor(Math.random() * 20) + 1
    };
  }

  // Main analysis method
  async analyzeRepository(url) {
    const { owner, repo } = this.parseGitHubUrl(url);
    
    console.log(`🔍 Analyzing repository: ${owner}/${repo}`);
    
    try {
      // Fetch all repository data
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
    score += Math.min(repo.stargazers_count / 1000, 40);
    
    // Forks weight (max 20 points)
    score += Math.min(repo.forks_count / 100, 20);
    
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