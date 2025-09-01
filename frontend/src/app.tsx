import React, { useState, useEffect } from 'react';
import { Moon, Sun, Globe, Github, Linkedin, ExternalLink, Loader, CheckCircle, AlertCircle, Star, GitFork, Eye } from 'lucide-react';
import { clsx } from 'clsx';

// Types
interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  homepage: string;
  language: string;
  stars: number;
  forks: number;
  watchers: number;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  owner: {
    login: string;
    avatar: string;
  };
}

interface AnalysisData {
  repository: Repository;
  readme: {
    content: string;
    html: string;
  } | null;
  languages: {
    stats: { name: string; percentage: string }[];
    primary: string;
  };
  techStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    tools: string[];
    frameworks: string[];
  };
  features: string[];
  analysis: {
    complexity: string;
    category: string;
    deployability: string;
    score: number;
  };
  generatedAt: string;
}

interface AnalysisResponse {
  data: AnalysisData;
  cached: boolean;
  cacheAge?: number;
  analysisTime?: number;
  accessCount?: number;
}

// Translations
const translations = {
  en: {
    title: 'RepoSite',
    subtitle: 'Portfolio as a Service',
    heading: 'Bring Your GitHub Repository to Life',
    description: 'Transform your GitHub repositories into beautiful, professional websites instantly',
    placeholder: 'Enter GitHub repository URL (e.g., https://github.com/user/repo)',
    generateButton: 'Generate My Website',
    tryAnother: 'Try Another Repository',
    
    // Status messages
    connecting: 'Connecting to GitHub API...',
    fetching: 'Fetching repository data for',
    analyzing: 'Analyzing code and identifying framework...',
    parsing: 'Parsing README.md for project description...',
    building: 'Building project website from template...',
    populating: 'Populating content: project name, description, and tech stack...',
    deploying: 'Deploying to the web...',
    finalizing: 'Finalizing... Almost there!',
    
    // Success/Error
    success: 'Website Generated Successfully!',
    viewWebsite: 'View Generated Website',
    error: 'Analysis Failed',
    invalidUrl: 'Please enter a valid GitHub repository URL',
    
    // Repository info
    stars: 'Stars',
    forks: 'Forks',
    watchers: 'Watchers',
    language: 'Primary Language',
    complexity: 'Complexity',
    category: 'Category',
    deployability: 'Deployability',
    score: 'Project Score',
    features: 'Features',
    techStack: 'Tech Stack',
    cached: 'Cached Result',
    analysisTime: 'Analysis Time',
    
    // Footer
    madeWith: 'Made with ❤️ by RepoSite Team',
  },
  ja: {
    title: 'RepoSite',
    subtitle: 'ポートフォリオ・アズ・ア・サービス',
    heading: 'あなたのGitHubリポジトリに命を吹き込む',
    description: 'GitHubリポジトリを美しいプロフェッショナルなウェブサイトに瞬時に変換',
    placeholder: 'GitHubリポジトリのURLを入力 (例: https://github.com/user/repo)',
    generateButton: 'ウェブサイトを生成',
    tryAnother: '別のリポジトリを試す',
    
    // Status messages
    connecting: 'GitHub APIに接続中...',
    fetching: 'リポジトリデータを取得中',
    analyzing: 'コードを分析してフレームワークを特定中...',
    parsing: 'README.mdを解析してプロジェクト説明を取得中...',
    building: 'テンプレートからプロジェクトウェブサイトを構築中...',
    populating: 'コンテンツを挿入中：プロジェクト名、説明、技術スタック...',
    deploying: 'ウェブにデプロイ中...',
    finalizing: '最終処理中... もうすぐ完了！',
    
    // Success/Error
    success: 'ウェブサイトの生成が完了しました！',
    viewWebsite: '生成されたウェブサイトを表示',
    error: '分析に失敗しました',
    invalidUrl: '有効なGitHubリポジトリのURLを入力してください',
    
    // Repository info
    stars: 'スター',
    forks: 'フォーク',
    watchers: 'ウォッチャー',
    language: '主言語',
    complexity: '複雑度',
    category: 'カテゴリ',
    deployability: 'デプロイ可能性',
    score: 'プロジェクト評価',
    features: '機能',
    techStack: '技術スタック',
    cached: 'キャッシュ結果',
    analysisTime: '分析時間',
    
    // Footer
    madeWith: 'RepoSiteチームが❤️を込めて制作',
  }
} as const;

type Language = keyof typeof translations;

// Hook for theme management
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return { theme, toggleTheme };
}

// Status messages component
function StatusMessage({ message, isActive }: { message: string; isActive: boolean }) {
  return (
    <div className={clsx(
      'flex items-center space-x-3 py-2 px-4 rounded-lg transition-all duration-300',
      isActive ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'text-gray-500'
    )}>
      {isActive ? (
        <Loader className="w-4 h-4 animate-spin text-primary-600" />
      ) : (
        <CheckCircle className="w-4 h-4 text-green-500" />
      )}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

// Repository analysis result component
function AnalysisResult({ data }: { data: AnalysisData }) {
  const [lang] = useState<Language>('en'); // Could be made dynamic
  const t = translations[lang];

  const openGeneratedWebsite = () => {
    const websiteHtml = generateWebsiteHTML(data);
    const blob = new Blob([websiteHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="card animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <img 
            src={data.repository.owner.avatar} 
            alt={data.repository.owner.login}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {data.repository.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {data.repository.fullName}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
            {t.success}
          </span>
        </div>
      </div>

      {data.repository.description && (
        <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm leading-relaxed">
          {data.repository.description}
        </p>
      )}

      {/* Repository Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-center text-yellow-500 mb-1">
            <Star className="w-4 h-4" />
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.repository.stars.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">{t.stars}</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-center text-blue-500 mb-1">
            <GitFork className="w-4 h-4" />
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.repository.forks.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">{t.forks}</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-center text-green-500 mb-1">
            <Eye className="w-4 h-4" />
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.repository.watchers.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">{t.watchers}</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.analysis.score}
          </div>
          <div className="text-xs text-gray-500">{t.score}</div>
        </div>
      </div>

      {/* Tech Stack */}
      {Object.values(data.techStack).some(arr => arr.length > 0) && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t.techStack}</h4>
          <div className="space-y-2">
            {Object.entries(data.techStack).map(([category, technologies]) => 
              technologies.length > 0 && (
                <div key={category} className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-gray-500 capitalize min-w-20">
                    {category}:
                  </span>
                  {technologies.map(tech => (
                    <span key={tech} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100">
                      {tech}
                    </span>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Features */}
      {data.features.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t.features}</h4>
          <ul className="space-y-1">
            {data.features.slice(0, 5).map((feature, index) => (
              <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={openGeneratedWebsite}
          className="btn-primary flex-1 flex items-center justify-center space-x-2"
        >
          <ExternalLink className="w-4 h-4" />
          <span>{t.viewWebsite}</span>
        </button>
        <a
          href={data.repository.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex items-center justify-center space-x-2"
        >
          <Github className="w-4 h-4" />
          <span>GitHub</span>
        </a>
      </div>
    </div>
  );
}

// Generate website HTML
function generateWebsiteHTML(data: AnalysisData): string {
  const techStackItems = Object.entries(data.techStack)
    .filter(([, technologies]) => technologies.length > 0)
    .map(([category, technologies]) => 
      `<div class="tech-category">
        <h4>${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
        <div class="tech-tags">
          ${technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
        </div>
      </div>`
    ).join('');

  const featuresHtml = data.features.length > 0 
    ? `<section class="features">
        <h2>Features</h2>
        <ul class="feature-list">
          ${data.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.repository.name} - Generated by RepoSite</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .hero { 
            background: rgba(255,255,255,0.95); 
            border-radius: 20px; 
            padding: 60px 40px; 
            margin-bottom: 40px;
            backdrop-filter: blur(10px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .hero h1 { 
            font-size: 3rem; 
            font-weight: 700; 
            margin-bottom: 20px; 
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .description { 
            font-size: 1.2rem; 
            color: #666; 
            margin-bottom: 30px; 
        }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 20px; 
            margin-bottom: 40px; 
        }
        .stat { 
            background: white; 
            padding: 20px; 
            border-radius: 15px; 
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        .stat-value { 
            font-size: 2rem; 
            font-weight: 700; 
            color: #667eea; 
        }
        .stat-label { 
            color: #666; 
            font-size: 0.9rem; 
        }
        .section { 
            background: rgba(255,255,255,0.95); 
            border-radius: 20px; 
            padding: 40px; 
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }
        .section h2 { 
            font-size: 2rem; 
            margin-bottom: 25px; 
            color: #333; 
        }
        .tech-stack { 
            display: grid; 
            gap: 20px; 
        }
        .tech-category h4 { 
            color: #667eea; 
            margin-bottom: 10px; 
            font-weight: 600;
        }
        .tech-tags { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 8px; 
        }
        .tech-tag { 
            background: linear-gradient(135deg, #667eea, #764ba2); 
            color: white; 
            padding: 8px 16px; 
            border-radius: 25px; 
            font-size: 0.9rem;
            font-weight: 500;
        }
        .feature-list { 
            list-style: none; 
        }
        .feature-list li { 
            padding: 10px 0; 
            border-bottom: 1px solid #eee; 
            position: relative;
            padding-left: 25px;
        }
        .feature-list li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #667eea;
            font-weight: bold;
        }
        .links { 
            display: flex; 
            gap: 20px; 
            justify-content: center;
            margin-top: 40px;
        }
        .btn { 
            padding: 15px 30px; 
            border-radius: 10px; 
            text-decoration: none; 
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-primary { 
            background: linear-gradient(135deg, #667eea, #764ba2); 
            color: white; 
        }
        .btn-secondary { 
            background: rgba(102, 126, 234, 0.1); 
            color: #667eea; 
            border: 2px solid #667eea;
        }
        .btn:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .footer { 
            text-align: center; 
            padding: 40px; 
            color: rgba(255,255,255,0.8);
        }
        @media (max-width: 768px) {
            .hero { padding: 40px 20px; }
            .hero h1 { font-size: 2rem; }
            .section { padding: 20px; }
            .links { flex-direction: column; align-items: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <h1>${data.repository.name}</h1>
            <p class="description">${data.repository.description || 'An amazing project built with modern technologies'}</p>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${data.repository.stars.toLocaleString()}</div>
                    <div class="stat-label">Stars</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${data.repository.forks.toLocaleString()}</div>
                    <div class="stat-label">Forks</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${data.repository.language || 'Multi'}</div>
                    <div class="stat-label">Language</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${data.analysis.score}</div>
                    <div class="stat-label">Quality Score</div>
                </div>
            </div>
        </div>

        ${techStackItems ? `<div class="section">
            <h2>Technology Stack</h2>
            <div class="tech-stack">${techStackItems}</div>
        </div>` : ''}

        ${featuresHtml}

        <div class="section">
            <h2>Project Information</h2>
            <p><strong>Category:</strong> ${data.analysis.category}</p>
            <p><strong>Complexity:</strong> ${data.analysis.complexity}</p>
            <p><strong>Deployability:</strong> ${data.analysis.deployability}</p>
            <p><strong>Last Updated:</strong> ${new Date(data.repository.updatedAt).toLocaleDateString()}</p>
        </div>

        <div class="links">
            <a href="${data.repository.url}" target="_blank" class="btn btn-primary">View Source Code</a>
            ${data.repository.homepage ? `<a href="${data.repository.homepage}" target="_blank" class="btn btn-secondary">Live Demo</a>` : ''}
        </div>
    </div>

    <div class="footer">
        <p>Generated by <strong>RepoSite</strong> - Portfolio as a Service</p>
        <p>Bringing GitHub repositories to life, one website at a time ✨</p>
    </div>
</body>
</html>`;
}

// Main App Component
function App() {
  const { theme, toggleTheme } = useTheme();
  const [lang, setLang] = useState<Language>('en');
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  const analysisSteps = [
    t.connecting,
    `${t.fetching}...`,
    t.analyzing,
    t.parsing,
    t.building,
    t.populating,
    t.deploying,
    t.finalizing
  ];

  const validateGitHubUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/github\.com\/[\w\.-]+\/[\w\.-]+\/?$/,
      /^https?:\/\/github\.com\/[\w\.-]+\/[\w\.-]+\.git$/
    ];
    return patterns.some(pattern => pattern.test(url.trim()));
  };

  const analyzeRepository = async () => {
    if (!validateGitHubUrl(repoUrl)) {
      setError(t.invalidUrl);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisData(null);
    setCurrentStep(0);

    try {
      // Simulate step progression
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < analysisSteps.length - 1) {
            return prev + 1;
          } else {
            clearInterval(stepInterval);
            return prev;
          }
        });
      }, 1500);

      const response = await fetch('/api/repository/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: repoUrl.trim() }),
      });

      const result: AnalysisResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      clearInterval(stepInterval);
      setAnalysisData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
      setCurrentStep(0);
    }
  };

  const resetForm = () => {
    setRepoUrl('');
    setAnalysisData(null);
    setError(null);
    setIsAnalyzing(false);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">{t.title}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setLang(lang === 'en' ? 'ja' : 'en')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-1"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{lang.toUpperCase()}</span>
            </button>
            
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pb-12">
        {!analysisData ? (
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 text-shadow">
              {t.heading}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
              {t.description}
            </p>

            {/* Input Section */}
            <div className="glass dark:glass-dark rounded-2xl p-8 mb-8 max-w-2xl mx-auto">
              <div className="space-y-6">
                <div>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder={t.placeholder}
                    className="w-full px-6 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200"
                    disabled={isAnalyzing}
                  />
                </div>
                
                <button
                  onClick={analyzeRepository}
                  disabled={isAnalyzing || !repoUrl.trim()}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center space-x-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Analyzing...</span>
                    </span>
                  ) : (
                    t.generateButton
                  )}
                </button>
              </div>
            </div>

            {/* Progress Section */}
            {isAnalyzing && (
              <div className="card max-w-2xl mx-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  </div>
                  
                  <div className="space-y-2">
                    {analysisSteps.map((step, index) => (
                      <StatusMessage
                        key={index}
                        message={step}
                        isActive={index === currentStep}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error Section */}
            {error && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">{t.error}</h3>
                      <p className="text-red-600 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Success Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t.success}</h2>
              <button
                onClick={resetForm}
                className="btn-secondary"
              >
                {t.tryAnother}
              </button>
            </div>

            {/* Analysis Result */}
            <AnalysisResult data={analysisData} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t.madeWith}
            </p>
            <div className="flex items-center space-x-6">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
