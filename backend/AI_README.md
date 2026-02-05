# 🤖 AI-Enhanced Resume Analysis

Advanced AI features for intelligent skill extraction and resume matching.

---

## 🎯 Overview

The Job Analyser uses AI models to provide semantic skill extraction that goes beyond keyword matching. This enables:

- Understanding skill variations and synonyms
- Detecting implied skills from context
- Classifying skill proficiency levels
- Categorizing must-have vs nice-to-have skills

---

## ⚡ Quick Setup

### Option 1: OpenRouter (Recommended)

```bash
# .env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-your-key-here
AI_MODEL=openai/gpt-4o-mini
```

Get your key at [openrouter.ai](https://openrouter.ai)

### Option 2: Ollama (Local)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull qwen2.5:7b
```

```bash
# .env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
AI_MODEL=qwen2.5:7b
```

### Option 3: OpenAI Direct

```bash
# .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
AI_MODEL=gpt-4o-mini
```

---

## 🧠 AI Features

### Semantic Skill Extraction

The AI understands context and variations:

| Input Text | Extracted Skills |
|------------|------------------|
| "Experience with AWS infrastructure" | AWS, Cloud Infrastructure, DevOps |
| "Built RESTful services" | REST API, Backend Development |
| "CI/CD pipelines using GitHub" | GitHub Actions, CI/CD, DevOps |

### Proficiency Classification

Skills are classified by expertise level:

```json
{
  "expert": ["javascript", "react"],
  "proficient": ["node.js", "python"],
  "familiar": ["kubernetes", "aws"]
}
```

### Skill Categorization

Jobs skills are categorized by priority:

```json
{
  "must_have": ["javascript", "react", "node.js"],
  "nice_to_have": ["python", "aws", "docker"]
}
```

---

## 📊 Analysis Output

### Experience Alignment

```json
{
  "experienceAlignment": {
    "yourExperience": "3.7 years",
    "jobRequires": "5+ years",
    "levelMatch": true,
    "yearsMatch": false,
    "assessment": "good"
  }
}
```

### Skills Gap Analysis

```json
{
  "skillsGaps": {
    "critical": ["python", "aws"],
    "minor": ["kubernetes"],
    "severity": "medium"
  }
}
```

### AI Recommendations

```json
{
  "enhancedInsights": {
    "aiRecommendation": "Strong candidate with solid frontend skills...",
    "careerAdvice": ["Consider gaining cloud certification"],
    "skillDevelopmentPlan": {
      "immediate": ["python", "aws"],
      "shortTerm": ["kubernetes"],
      "timeframe": "1-3 months"
    }
  }
}
```

---

## 🔧 Supported Models

### OpenRouter Models

| Model | Speed | Cost | Quality |
|-------|-------|------|---------|
| `openai/gpt-4o-mini` | ⚡ Fast | 💰 Low | ⭐⭐⭐⭐ |
| `openai/gpt-4o` | 🐢 Slower | 💰💰 Medium | ⭐⭐⭐⭐⭐ |
| `anthropic/claude-3-haiku` | ⚡ Fast | 💰 Low | ⭐⭐⭐⭐ |
| `anthropic/claude-3-5-sonnet` | 🐢 Slower | 💰💰 Medium | ⭐⭐⭐⭐⭐ |

### Ollama Models

| Model | RAM Required | Quality |
|-------|--------------|---------|
| `llama3:8b` | 8GB | ⭐⭐⭐⭐ |
| `qwen2.5:7b` | 6GB | ⭐⭐⭐⭐ |
| `mistral:7b` | 6GB | ⭐⭐⭐⭐ |
| `llama3:70b` | 48GB | ⭐⭐⭐⭐⭐ |

---

## 🔄 Fallback Behavior

When AI is unavailable, the system automatically falls back to dictionary-based extraction:

1. **API Error** → Uses 200+ skills dictionary
2. **Rate Limited** → Retries with exponential backoff
3. **Invalid Response** → Falls back to keyword matching
4. **Network Issues** → Uses cached results if available

---

## 📈 Performance

| Method | Latency | Accuracy |
|--------|---------|----------|
| Dictionary-based | ~50ms | 70-80% |
| AI-enhanced (GPT-4o-mini) | ~1-2s | 90-95% |
| AI-enhanced (Ollama local) | ~2-5s | 85-90% |

---

## 💰 Cost Estimates

### OpenRouter/OpenAI (GPT-4o-mini)

- Per analysis: ~$0.001-0.003
- 1000 analyses: ~$1-3
- Monthly (10K analyses): ~$10-30

### Ollama (Local)

- Hardware: ~$0 (uses your GPU/CPU)
- Electricity: Minimal
- No ongoing costs

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "AI not configured" | Check API key in `.env` |
| Slow responses | Try smaller model or local Ollama |
| Inconsistent results | Lower temperature in `aiConfig.js` |
| Ollama timeout | Ensure Ollama service is running |
| Rate limiting | Add delays between requests |

---

## 📄 Related Documentation

- [Backend README](./README.md) - API endpoints and configuration
- [Main README](../README.md) - Project overview and installation