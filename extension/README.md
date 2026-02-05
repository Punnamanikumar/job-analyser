# 🧩 Job Analyser Chrome Extension

A Chrome extension that provides AI-powered resume matching for LinkedIn and Naukri job postings.

---

## 📋 Overview

This extension uses Chrome's Side Panel API to provide a seamless job analysis experience. It extracts job data from supported sites and sends it to the backend for AI-powered resume matching.

---

## 📁 File Structure

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome extension configuration (Manifest V3) |
| `popup.html` | Side panel UI layout |
| `popup.js` | UI logic and API communication |
| `styles.css` | Extension styling |
| `content.js` | Job data extraction from web pages |
| `background.js` | Service worker for extension lifecycle |

---

## 🛠️ Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select this `extension` folder
5. Pin the extension to your toolbar for easy access

---

## 🌐 Supported Sites

| Site | Status | Features |
|------|--------|----------|
| **LinkedIn** | ✅ Fully Supported | Job title, description, company, experience |
| **Naukri.com** | ✅ Fully Supported | Job title, description, skills, experience |

---

## 📦 Components

### content.js - Page Scraping

Extracts job data from supported pages:

- **Job Title** - Position name
- **Description** - Full job description text
- **Company** - Employer name
- **Experience** - Required years of experience
- **Skills** - Listed skill requirements (when available)
- **URL** - Job posting URL for reference

### popup.js - UI Logic

Handles all user interactions:

- **Extract Job Data** - Triggers content script to scrape page
- **Analyze Resume** - Sends data to backend API
- **Add Missing Skills** - Updates portfolio with new skills
- **View History** - Shows previous analyses
- **Toggle Profile Mode** - Switch between resume upload and portfolio

### background.js - Service Worker

Manages extension lifecycle:

- Opens side panel on icon click
- Handles extension installation events
- Coordinates messaging between content script and popup

---

## 🔧 Configuration

### Manifest Permissions

```json
{
  "permissions": [
    "scripting",    // Inject content scripts
    "activeTab",    // Access current tab
    "tabs",         // Tab management
    "storage",      // Local data storage
    "sidePanel"     // Side panel API
  ],
  "host_permissions": [
    "https://www.linkedin.com/*",
    "https://www.naukri.com/*"
  ]
}
```

---

## 🚀 Usage

1. **Navigate** to a job posting on LinkedIn or Naukri
2. **Click** the Job Analyser extension icon
3. **Click** "Extract Job Data" to capture job details
4. **Choose** to use personal profile or upload a resume
5. **Click** "Analyze Resume" for AI-powered matching

---

## 🔗 Backend Communication

The extension communicates with the backend via REST API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/analyze-resume-stream` | POST | SSE streaming analysis |
| `/api/analyze-resume` | POST | Standard analysis |
| `/api/add-skill` | POST | Add skill to portfolio |
| `/api/added-skills` | GET | Get added skills list |

Default backend URL: `http://localhost:3000`

---

## 🐛 Debugging

### Enable Console Logs

Open Chrome DevTools (F12) on the extension:
- **Side Panel**: Right-click on side panel → Inspect
- **Content Script**: Regular DevTools on job page
- **Background**: `chrome://extensions/` → Service Worker link

### Common Issues

| Issue | Solution |
|-------|----------|
| "Not on job page" | Navigate to a specific job posting, not search results |
| "Extract failed" | Refresh the page and try again |
| "Backend not responding" | Ensure backend is running on port 3000 |
| Side panel not opening | Reload extension at `chrome://extensions/` |

---

## 📝 Development

### Testing Changes

1. Make edits to extension files
2. Go to `chrome://extensions/`
3. Click the reload icon on the extension
4. Test on a job posting page

### Key Files to Edit

- **UI Changes**: Edit `popup.html` and `styles.css`
- **Logic Changes**: Edit `popup.js`
- **Scraping Changes**: Edit `content.js`

---

## 🔒 Privacy

- All data processing happens locally or through your configured backend
- No data is sent to third parties
- Resume/portfolio data stays on your machine
- Job data is cached locally for performance

---

## 📄 License

MIT License - See root [LICENSE](../LICENSE) for details.
