import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Github, Sun, Moon, Globe, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Translations
const translations = {
  en: {
    title: "Bring Your GitHub Repository to Life",
    subtitle: "Transform any public repository into a beautiful portfolio website in seconds",
    inputPlaceholder: "Enter GitHub repository URL...",
    generateButton: "Generate My Website",
    processing: "Processing...",
    steps: {
      connecting: "Connecting to GitHub API...",
      fetching: "Fetching repository data...",
      analyzing: "Analyzing code structure...",
      building: "Building portfolio website...",
      deploying: "Deploying to the web..."
    },
    success: {
      title: "Portfolio Generated!",
      description: "Your portfolio website is ready to view",
      viewButton: "View Portfolio"
    },
    error: {
      invalidUrl: "Please enter a valid GitHub repository URL",
      analysisFailed: "Failed to analyze repository. Please try again."
    },
    footer: {
      poweredBy: "Powered by",
      rights: "All rights reserved"
    }
  },
  ja: {
    title: "GitHubリポジトリを蘇らせる",
    subtitle: "公開リポジトリを美しいポートフォリオウェブサイトに瞬時に変換",
    inputPlaceholder: "GitHubリポジトリURLを入力...",
    generateButton: "ウェブサイトを生成",
    processing: "処理中...",
    steps: {
      connecting: "GitHub APIに接続中...",
      fetching: "リポジトリデータを取得中...",
      analyzing: "コード構造を分析中...",
      building: "ポートフォリオウェブサイトを構築中...",
      deploying: "ウェブにデプロイ中..."
    },
    success: {
      title: "ポートフォリオが生成されました！",
      description: "ポートフォリオウェブサイトの閲覧が可能です",
      viewButton: "ポートフォリオを見る"
    },
    error: {
      invalidUrl: "有効なGitHubリポジトリURLを入力してください",
      analysisFailed: "リポジトリの分析に失敗しました。もう一度お試しください。"
    },
    footer: {
      poweredBy: "搭載技術",
      rights: "全著作権所有"
    }
  }
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false }
  }
});

function App() {
  const [language, setLanguage] = useState<'en' | 'ja'>('en');
  const [darkMode, setDarkMode] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<any>(null);

  const t = translations[language];

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark');
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ja' : 'en');
  };

  // Processing steps
  const processingSteps = [
    t.steps.connecting,
    t.steps.fetching,
    t.steps.analyzing,
    t.steps.building,
    t.steps.deploying
  ];

  const simulateProcessing = async () => {
    for (let i = 0; i < processingSteps.length; i++) {
      setCurrentStep(i);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  };

  const validateUrl = (url: string) => {
    const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/[\w-]+/;
    return githubRegex.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUrl(repoUrl)) {
      toast.error(t.error.invalidUrl);
      return;
    }

    setIsProcessing(true);
    setCurrentStep(0);
    setGeneratedUrl(null);

    try {
      await simulateProcessing();

      // Make actual API call
      const response = await axios.post(`${API_BASE_URL}/repo/analyze`, {
        url: repoUrl
      });

      if (response.data.success) {
        setRepoData(response.data.data);
        
        // Create blob URL for generated HTML
        const blob = new Blob([response.data.data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setGeneratedUrl(url);
        
        toast.success(t.success.title);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error(t.error.analysisFailed);
    } finally {
      setIsProcessing(false);
    }
  };

  const openPortfolio = () => {
    if (generatedUrl) {
      window.open(generatedUrl, '_blank');
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300`}>
        <Toaster position="top-right" />
        
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <Github className="w-8 h-8 text-indigo-600" />
                <span className="text-xl font-bold">RepoSite</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleLanguage}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <Globe className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-20 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                {t.title}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                {t.subtitle}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            >
              {!isProcessing && !generatedUrl ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <input
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder={t.inputPlaceholder}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
                  >
                    {t.generateButton}
                  </button>
                </form>
              ) : null}

              {isProcessing && (
                <div className="space-y-6">
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                  
                  <div className="space-y-4">
                    {processingSteps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ 
                          opacity: index <= currentStep ? 1 : 0.5,
                          x: 0
                        }}
                        className={`flex items-center space-x-3 ${
                          index < currentStep ? 'text-green-600' : 
                          index === currentStep ? 'text-indigo-600 font-semibold' : 
                          'text-gray-400'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          index < currentStep ? 'bg-green-500' : 
                          index === currentStep ? 'bg-indigo-500 animate-pulse' : 
                          'bg-gray-300'
                        }`} />
                        <span>{step}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {generatedUrl && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6"
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {t.success.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t.success.description}
                    </p>
                  </div>
                  
                  <button
                    onClick={openPortfolio}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
                  >
                    {t.success.viewButton}
                  </button>

                  <button
                    onClick={() => {
                      setGeneratedUrl(null);
                      setRepoUrl('');
                      setRepoData(null);
                    }}
                    className="ml-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Try another repository
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <span>{t.footer.poweredBy}</span>
                <Github className="w-4 h-4" />
                <span>RepoSite</span>
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                © 2024 {t.footer.rights}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;