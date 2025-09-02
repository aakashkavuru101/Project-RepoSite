# RepoSite - Portfolio as a Service

A sophisticated Portfolio-as-a-Service application that analyzes GitHub repositories and generates beautiful, professional portfolio websites instantly.

![RepoSite Homepage](https://github.com/user-attachments/assets/6dc19961-a3da-4334-a91d-e1eeed92f268)

## 🌟 Features

### Core Functionality
- **🔍 GitHub Repository Analysis**: Comprehensive analysis of any public GitHub repository
- **🎨 Automatic Website Generation**: Creates beautiful, professional portfolio websites
- **📊 Tech Stack Detection**: Automatically identifies frameworks, libraries, and tools
- **📝 README Parsing**: Extracts features and project information
- **⚡ Real-time Progress**: Step-by-step analysis with beautiful progress indicators

### User Experience
- **🌍 Bilingual Support**: Instant switching between English and Japanese
- **🌓 Dark/Light Mode**: Smooth theme transitions with system preference detection
- **📱 Fully Responsive**: Works perfectly across all devices and screen sizes
- **✨ Professional Animations**: Glass morphism effects and micro-interactions
- **🚀 Lightning Fast**: Advanced caching system for 40x faster repeated requests

### Technical Excellence
- **🔒 Production Ready**: Security-first approach with rate limiting and validation
- **💾 Intelligent Caching**: MongoDB-based caching with graceful fallbacks
- **🛡️ Error Handling**: Comprehensive error handling and user feedback
- **🎯 Type Safety**: Full TypeScript implementation for reliability

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MongoDB (optional - app works without it)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aakashkavuru101/Project-RepoSite.git
   cd Project-RepoSite
   ```

2. **Set up Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your GitHub token and MongoDB URI
   ```

3. **Set up Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm start

   # Terminal 2 - Frontend  
   cd frontend && npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎯 Usage

### Basic Workflow

1. **Enter GitHub URL**: Paste any public GitHub repository URL
2. **Watch Analysis**: Real-time progress with step-by-step updates
3. **View Results**: Comprehensive repository insights and statistics
4. **Generate Website**: Click to create and preview the portfolio website
5. **Customize**: Switch themes and languages as needed

![Analysis Progress](https://github.com/user-attachments/assets/f39721b5-92a7-4723-8c11-e726e8423385)

![Analysis Results](https://github.com/user-attachments/assets/dcc5eb41-cf72-4ba6-8926-06229046b795)

### Generated Website Example

The system creates beautiful, professional websites with:
- Project overview and statistics
- Technology stack visualization
- Features extraction from README
- Direct links to source code and live demos

![Generated Website](https://github.com/user-attachments/assets/f41a89ca-8665-4762-943d-66397d5b0ccf)

### Theme Support

Dark and light modes with smooth transitions:

![Dark Theme](https://github.com/user-attachments/assets/aa720b4f-3f78-4620-8a9b-0cc1ee45e0bb)

## 🏗️ Architecture

### Backend (Node.js + Express)
```
backend/
├── src/
│   ├── index.js              # Main server file
│   ├── routes/
│   │   ├── repository.js     # Repository analysis endpoints
│   │   └── cache.js          # Cache management endpoints
│   ├── services/
│   │   └── githubService.js  # GitHub API integration
│   └── models/
│       └── RepositoryCache.js # MongoDB caching model
├── package.json
└── .env.example
```

### Frontend (React + TypeScript + Vite)
```
frontend/
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles with Tailwind
├── public/
├── package.json
└── vite.config.ts
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/reposite
GITHUB_API_TOKEN=your_github_token_here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

#### Frontend
The frontend automatically connects to the backend via Vite proxy configuration.

## 🌐 API Documentation

### Repository Analysis
```http
POST /api/repository/analyze
Content-Type: application/json

{
  "url": "https://github.com/user/repo",
  "forceRefresh": false
}
```

Response includes:
- Repository metadata and statistics
- Technology stack analysis
- README content and features
- Project complexity and deployability scores
- Generated website data

### Cache Management
```http
GET /api/cache/stats        # Cache statistics
DELETE /api/cache/cleanup   # Remove expired entries
DELETE /api/cache/clear     # Clear all cache
GET /api/cache/search?q=react # Search cached repositories
```

## 🛠️ Development

### Available Scripts

#### Backend
```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
```

#### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Tech Stack

#### Backend Technologies
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database for caching
- **Axios** - HTTP client for GitHub API
- **Joi** - Input validation
- **Helmet** - Security middleware

#### Frontend Technologies
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons

## 🚀 Deployment

### Production Checklist

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Configure proper MongoDB URI
   - Set up GitHub API token with appropriate permissions

2. **Security**
   - Enable HTTPS
   - Configure proper CORS origins
   - Set up rate limiting for production traffic

3. **Hosting Options**
   - **Frontend**: Vercel, Netlify, GitHub Pages
   - **Backend**: Railway, Render, DigitalOcean
   - **Database**: MongoDB Atlas, local MongoDB instance

### Docker Support (Optional)
```dockerfile
# Example Dockerfile for backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- GitHub API for repository data
- React community for excellent documentation
- Tailwind CSS for the beautiful design system
- All contributors and users of this project

## 📞 Support

For support, email support@reposite.dev or create an issue on GitHub.

---

**Made with ❤️ by RepoSite Team**
