# 🖥️ Job Analyser Backend

Node.js/Express backend API for the Job Analyser Chrome extension with AI-powered resume matching.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev

# Or production server
npm start
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend root with these settings:

#### AI Provider (Choose One)

**Option 1: OpenRouter (Recommended for Cloud)**
```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-your-api-key
AI_MODEL=openai/gpt-4o-mini
```

**Option 2: Ollama (Local/Self-hosted)**

First, install Ollama:

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows - Download from https://ollama.ai/download
```

Start Ollama and pull a model:

```bash
# Start Ollama service
ollama serve

# Pull recommended model (in another terminal)
ollama pull qwen2.5:7b

# Or use other models
ollama pull llama3:8b
ollama pull mistral:7b
```

Configure `.env`:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
AI_MODEL=qwen2.5:7b
```

**Option 3: OpenAI Direct**
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key
AI_MODEL=gpt-4o-mini
```

#### Server Settings

```env
PORT=3000
NODE_ENV=development
```

#### Feature Flags

```env
ENABLE_AI_ANALYSIS=true
ENABLE_FUZZY_MATCHING=true
ENABLE_DETAILED_LOGGING=false
```

---

## 📡 API Endpoints

### Health Check

```
GET /api/health
```

Returns server status and configuration info.

---

### Analyze Resume (Standard)

```
POST /api/analyze-resume
Content-Type: application/json
```

**Request Body:**
```json
{
  "jobData": {
    "title": "Senior Software Engineer",
    "description": "Job description text...",
    "url": "https://linkedin.com/jobs/view/123"
  },
  "usePersonalProfile": true
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "matchPercentage": 75,
    "matchedSkills": ["javascript", "react", "node.js"],
    "missingSkills": [
      { "skill": "kubernetes", "category": "critical" },
      { "skill": "graphql", "category": "minor" }
    ],
    "experienceAlignment": {
      "yourExperience": "3.7 years",
      "jobRequires": "5+ years",
      "levelMatch": true,
      "yearsMatch": false
    }
  }
}
```

---

### Analyze Resume (Streaming)

```
POST /api/analyze-resume-stream
Content-Type: application/json
```

Returns Server-Sent Events (SSE) for real-time progress updates:

```
data: {"type":"progress","message":"Extracting job skills..."}
data: {"type":"progress","message":"Analyzing resume..."}
data: {"type":"complete","analysis":{...}}
```

---

### Add Skill

```
POST /api/add-skill
Content-Type: application/json
```

**Request:**
```json
{
  "skill": "kubernetes"
}
```

---

### Get Added Skills

```
GET /api/added-skills
```

Returns list of skills added through the extension.

---

## 📂 Project Structure

```
backend/
├── server.js              # Express server & routes
├── package.json           # Dependencies
├── .env                   # Configuration (create from .env.example)
├── .env.example           # Environment template
├── me/
│   ├── portfolio.txt      # Your resume/portfolio
│   └── added_skills.json  # Skills added via UI
├── data/                  # Cached analyses (auto-generated)
└── utils/
    ├── aiConfig.js        # AI provider configuration
    ├── aiSkillExtractor.js # LLM-based skill extraction
    ├── enhancedAnalyser.js # Main analysis logic
    ├── dataManager.js     # Cache & storage management
    ├── skillExtractor.js  # Dictionary-based extraction
    ├── skillsDictionary.js # Skills database (200+)
    ├── matchingEngine.js  # Skill matching algorithms
    ├── fileProcessor.js   # PDF/DOCX text extraction
    ├── responseFormatter.js # API response formatting
    └── localOllamaAnalyser.js # Ollama integration
```

---

## 🤖 AI Models

### Supported Providers

| Provider | Models | Notes |
|----------|--------|-------|
| **OpenRouter** | GPT-4o, GPT-4o-mini, Claude 3, etc. | Multi-model access via single API |
| **Ollama** | LLaMA 3, Qwen 2.5, Mistral, etc. | Local, privacy-first |
| **OpenAI** | GPT-4o, GPT-4o-mini | Direct API access |

### AI Features

- **Semantic Skill Extraction** - Understands context and variations
- **Proficiency Detection** - Expert/Proficient/Familiar levels
- **Must-Have vs Nice-to-Have** - Skill prioritization
- **Experience Alignment** - Years and level matching
- **Intelligent Fallback** - Uses dictionary when AI unavailable

---

## 📊 Features

| Feature | Description |
|---------|-------------|
| **Multi-AI Support** | OpenRouter, Ollama, or OpenAI |
| **Skill Matching** | 200+ skills dictionary + AI extraction |
| **Experience Analysis** | Years and level matching |
| **File Processing** | PDF, DOCX, TXT support (up to 10MB) |
| **Caching** | Stores analyses for faster re-access |
| **Rate Limiting** | 100 requests per 15 minutes |
| **CORS Support** | Configured for Chrome extensions |
| **SSE Streaming** | Real-time analysis progress |

---

## 🔧 Development

### Scripts

```bash
npm start       # Production server
npm run dev     # Development with hot reload
npm run lint    # ESLint check
npm run format  # Prettier formatting
npm test        # Run test suite
```

### Testing API

```bash
# Health check
curl http://localhost:3000/api/health

# Analyze resume
curl -X POST http://localhost:3000/api/analyze-resume \
  -H "Content-Type: application/json" \
  -d '{
    "jobData": {
      "title": "Software Engineer",
      "description": "Node.js, React experience required"
    },
    "usePersonalProfile": true
  }'
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| AI not responding | Check API key in `.env` |
| Ollama errors | Ensure Ollama is running: `ollama serve` |
| Port in use | Change `PORT` in `.env` |
| Rate limited | Wait 15 minutes or adjust `RATE_LIMIT_*` vars |
| File upload fails | Check file size is under 10MB |

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.