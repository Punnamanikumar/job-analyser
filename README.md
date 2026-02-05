# 🎯 Job Analyser - AI-Powered Resume Match Extension

<div align="center">

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)
![AI](https://img.shields.io/badge/AI-GPT--4o%20%7C%20Ollama-orange.svg)

**Instantly analyze how well your resume matches any job posting on LinkedIn or Naukri**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture) • [API](#-api-reference)

</div>

---

## 🚀 What is Job Analyser?

Job Analyser is a **Chrome extension + Node.js backend** that uses AI to analyze your resume against job postings in real-time. Simply browse LinkedIn or Naukri jobs, and get instant insights on:

- ✅ **Match Percentage** - How well your skills align with the job
- ✅ **Matched Skills** - Skills you have that the job requires
- ✅ **Missing Skills** - Gap analysis with clickable skill additions
- ✅ **Experience Alignment** - Whether your experience level fits
- ✅ **AI Recommendations** - Personalized suggestions

---

## ✨ Features

### 🎯 Core Features

| Feature | Description |
|---------|-------------|
| **Real-time Analysis** | Analyze any job posting with one click |
| **Multi-site Support** | Works on LinkedIn and Naukri.com |
| **AI-Powered Matching** | Uses GPT-4o or local Ollama for intelligent skill extraction |
| **Skill Gap Detection** | Identifies critical vs minor skill gaps |
| **Experience Matching** | Compares your years of experience with job requirements |
| **Persistent Side Panel** | Stays open while you browse jobs |
| **Cache System** | Saves analysis results for faster re-access |

### 🛠️ Advanced Features

| Feature | Description |
|---------|-------------|
| **Add Missing Skills** | Click any missing skill to add it to your portfolio |
| **Personal Portfolio** | Use your `portfolio.txt` instead of uploading resume |
| **Streaming Responses** | Real-time AI analysis with progress updates |
| **Dual AI Support** | Switch between cloud (OpenRouter) and local (Ollama) |
| **Force Re-analysis** | Re-run analysis with updated portfolio |
| **Analysis History** | Track all your previous job analyses |

---

## 🆚 Why Job Analyser is Better

| Feature | Job Analyser | LinkedIn Premium | Generic ATS Scanners |
|---------|-------------|------------------|---------------------|
| **Real-time analysis** | ✅ Instant | ❌ No | ⚠️ Upload required |
| **AI-powered** | ✅ GPT-4o/Ollama | ❌ Basic matching | ⚠️ Keyword only |
| **Free to use** | ✅ Yes (local AI) | ❌ $30/month | ⚠️ Freemium |
| **Multiple job sites** | ✅ LinkedIn + Naukri | ❌ LinkedIn only | ⚠️ Varies |
| **Skill gap analysis** | ✅ Critical/Minor | ❌ None | ⚠️ Basic |
| **Add skills on-the-fly** | ✅ Yes | ❌ No | ❌ No |
| **Local AI option** | ✅ Privacy-first | ❌ Cloud only | ❌ Cloud only |
| **Open source** | ✅ Yes | ❌ No | ❌ No |

---

## 📦 Installation

### Prerequisites

- **Node.js** v18 or higher
- **npm** v8 or higher
- **Chrome browser**
- **AI Provider** (choose one):
  - OpenRouter API key (cloud)
  - Ollama installed locally

### Step 1: Clone the Repository

```bash
git clone https://github.com/punnamanikumar/job-analyser.git
cd job-analyser
```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
# Server Configuration
PORT=3000

# AI Provider: 'openrouter' or 'ollama'
AI_PROVIDER=openrouter

# For OpenRouter (cloud)
OPENROUTER_API_KEY=your_api_key_here
AI_MODEL=openai/gpt-4o-mini

# For Ollama (local)
# AI_PROVIDER=ollama
# AI_MODEL=qwen2.5:7b
# OLLAMA_BASE_URL=http://localhost:11434
```

Start the backend:

```bash
npm start
```

### Step 3: Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension` folder
5. Pin the extension to your toolbar

### Step 4: Configure Your Portfolio

Edit `backend/me/portfolio.txt` with your skills and experience, or upload a resume through the extension.

---

## 🎮 Usage

### Basic Workflow

1. **Navigate** to a job posting on LinkedIn or Naukri
2. **Click** the Job Analyser extension icon (opens side panel)
3. **Click** "Extract Job Data" to capture the job details
4. **Check** "Use Personal Profile" or upload a resume
5. **Click** "Analyze Resume" to get AI-powered insights

### Reading Results

```
📊 Match Score: 80%

✅ Matched Skills (12)
   Node.js, Express, MongoDB, React, AWS...

❌ Missing Skills (3)  [Click to add]
   ➕ Kubernetes  ➕ GraphQL  ➕ Terraform

📊 Experience Alignment
   Your Experience: 3.7 years | Job Requires: 5+ years
   Level Match: ✅ Yes | Years Match: ❌ No
```

### Adding Missing Skills

Click any missing skill to add it to your portfolio. The extension will:
1. Save the skill to `added_skills.json`
2. Clear the cached analysis
3. Show a confirmation toast

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Extension                         │
├─────────────────────────────────────────────────────────────────┤
│  popup.js          │  content.js         │  background.js       │
│  (Side Panel UI)   │  (Job Extraction)   │  (Service Worker)    │
└────────┬───────────┴─────────┬───────────┴──────────────────────┘
         │                     │
         │  HTTP/SSE           │  DOM Scraping
         │                     │
         ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Node.js Backend (Express)                    │
├─────────────────────────────────────────────────────────────────┤
│  server.js         │  enhancedAnalyser.js  │  aiSkillExtractor  │
│  (API Routes)      │  (Analysis Logic)      │  (AI Prompts)      │
├─────────────────────────────────────────────────────────────────┤
│  dataManager.js    │  skillExtractor.js    │  aiConfig.js       │
│  (Cache/Storage)   │  (Dictionary Match)   │  (AI Provider)     │
└────────┬───────────┴──────────────────────┴─────────┬───────────┘
         │                                            │
         ▼                                            ▼
┌─────────────────┐                        ┌─────────────────────┐
│   File System   │                        │    AI Provider      │
│  /data/*.json   │                        │  OpenRouter/Ollama  │
│  /me/portfolio  │                        │                     │
└─────────────────┘                        └─────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **Side Panel UI** | `popup.js`, `popup.html`, `styles.css` | User interface |
| **Content Script** | `content.js` | Extracts job data from pages |
| **API Server** | `server.js` | Express REST + SSE endpoints |
| **AI Extractor** | `aiSkillExtractor.js` | LLM-based skill extraction |
| **Analyser** | `enhancedAnalyser.js` | Skill matching logic |
| **Cache Manager** | `dataManager.js` | Stores analysis results |

---

## 🔌 API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/analyze-resume` | Analyze resume (JSON response) |
| `POST` | `/api/analyze-resume-stream` | Analyze resume (SSE streaming) |
| `POST` | `/api/add-skill` | Add skill to portfolio |
| `GET` | `/api/added-skills` | Get all added skills |

### Example: Analyze Resume

```bash
curl -X POST http://localhost:3000/api/analyze-resume \
  -H "Content-Type: application/json" \
  -d '{
    "jobData": {
      "title": "Senior Node.js Developer",
      "description": "5+ years experience with Node.js, Express, MongoDB...",
      "url": "https://linkedin.com/jobs/view/123"
    },
    "usePersonalProfile": true
  }'
```

---

## 🤖 AI Configuration

### OpenRouter (Cloud)

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-xxxxx
AI_MODEL=openai/gpt-4o-mini
```

Supported models:
- `openai/gpt-4o-mini` (recommended)
- `openai/gpt-4o`
- `anthropic/claude-3-haiku`

### Ollama (Local)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull qwen2.5:7b
```

```env
AI_PROVIDER=ollama
AI_MODEL=qwen2.5:7b
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 📂 Project Structure

```
job-analyser/
├── backend/
│   ├── server.js              # Express server
│   ├── package.json           # Dependencies
│   ├── .env                   # Configuration
│   ├── me/
│   │   ├── portfolio.txt      # Your resume/portfolio
│   │   └── added_skills.json  # Skills added via UI
│   ├── data/                  # Cached analyses
│   └── utils/
│       ├── aiConfig.js        # AI provider config
│       ├── aiSkillExtractor.js # AI prompts
│       ├── analyser.js        # Basic matching
│       ├── enhancedAnalyser.js # AI-enhanced matching
│       ├── dataManager.js     # Cache management
│       └── skillExtractor.js  # Dictionary-based extraction
│
├── extension/
│   ├── manifest.json          # Chrome extension config
│   ├── popup.html             # Side panel UI
│   ├── popup.js               # UI logic
│   ├── styles.css             # Styling
│   ├── content.js             # Page scraping
│   └── background.js          # Service worker
│
└── README.md
```

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Extension not loading | Reload extension at `chrome://extensions` |
| "Not on job page" error | Ensure you're on a job detail page, not search results |
| Backend not connecting | Check if `npm start` is running on port 3000 |
| AI not responding | Verify API key in `.env` or Ollama is running |
| Cache showing old data | Use "Re-Run Analysis" or delete files in `/data` |

### Debug Mode

Check browser console (F12) for extension logs:
- `Content script fully initialized`
- `Extracted experience: 5 - 10 years`
- `Found experience in job_header: X years`

---

## 🛣️ Roadmap

- [ ] Support for Indeed, Glassdoor
- [ ] Resume improvement suggestions
- [ ] Interview preparation based on job
- [ ] Browser extension for Firefox
- [ ] Mobile app version

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

```bash
# Fork the repo
git clone https://github.com/YOUR_USERNAME/job-analyser.git

# Create a branch
git checkout -b feature/amazing-feature

# Commit changes
git commit -m 'Add amazing feature'

# Push and create PR
git push origin feature/amazing-feature
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Punna Manikumar**

- GitHub: [@punnamanikumar](https://github.com/punnamanikumar)
- LinkedIn: [punnamanikumar](https://linkedin.com/in/punnamanikumar)
- Portfolio: [manikumarportfolio.netlify.app](https://manikumarportfolio.netlify.app)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ and AI

</div>