// Global variables
let extractedJobData = null;
let uploadedResume = null;
let usePersonalProfile = false;

// Backend API configuration
const API_BASE_URL = 'http://localhost:3000/api'; // Update with your backend URL
const API_ENDPOINTS = {
  enhanced: '/analyze-resume-enhanced',
  stream: '/analyze-resume-stream',  // SSE streaming endpoint for local AI
  checkAnalysis: '/check-analysis',
  getAnalysis: '/get-analysis',
  deleteAnalysis: '/delete-analysis',
  addSkill: '/add-skill'
};

// Load saved data on popup open
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Add side panel indicator
    console.log('Job Analyser Side Panel loaded');

    // Check if current page is a supported job site (LinkedIn or Naukri)
    const isSupportedJobSite = await checkIfSupportedJobSite();

    // Add status indicator to show this is persistent
    const header = document.querySelector('.header h1');
    if (header) {
      header.innerHTML = 'Job Analyser <small style="font-size: 12px; opacity: 0.8;">(Persistent)</small>';
    }

    if (isSupportedJobSite) {
      // Show analysis interface for supported job sites
      showAnalysisInterface();

      // Always refresh state for current tab URL
      await refreshStateForCurrentTab();
    } else {
      // Hide analysis interface and show supported sites message
      showSupportedSitesMessage();
    }

    // GLOBAL: Refresh button handler (works on any page to re-check and reload)
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('spinning');
        try {
          // Re-check if current page is a supported job site
          const isNowSupportedJobSite = await checkIfSupportedJobSite();

          if (isNowSupportedJobSite) {
            // Show analysis interface
            showAnalysisInterface();

            // Clear current data and re-extract
            extractedJobData = null;
            uploadedResume = null;
            const resultsSection = document.getElementById('resultsSection');
            if (resultsSection) resultsSection.style.display = 'none';

            // Refresh state for current tab
            await refreshStateForCurrentTab();

            // Re-initialize event listeners for the new interface
            initializeEventListeners();

            // Auto-extract job data
            await extractJobData();

            showToast('Page data refreshed successfully!', 'success');
          } else {
            showSupportedSitesMessage();
            showToast('Navigate to a LinkedIn or Naukri job page first', 'info');
          }
        } catch (error) {
          console.error('Refresh error:', error);
          showToast('Failed to refresh: ' + error.message, 'error');
        } finally {
          refreshBtn.classList.remove('spinning');
        }
      });
    }

    // Initialize event listeners with null checks (only for supported job sites)
    if (isSupportedJobSite) {
      const extractDataBtn = document.getElementById('extractData');
      const resumeFileInput = document.getElementById('resumeFile');
      const analyzeBtnEl = document.getElementById('analyzeBtn');
      const usePersonalProfileToggle = document.getElementById('usePersonalProfileToggle');
      const clearDataBtn = document.getElementById('clearData');
      const clearHistoryBtn = document.getElementById('clearHistory');

      if (extractDataBtn) extractDataBtn.addEventListener('click', extractJobData);
      if (resumeFileInput) resumeFileInput.addEventListener('change', handleFileUpload);
      if (analyzeBtnEl) analyzeBtnEl.addEventListener('click', analyzeResume);
      if (usePersonalProfileToggle) {
        usePersonalProfileToggle.addEventListener('change', (e) => {
          usePersonalProfile = e.target.checked;
          const uploadArea = document.getElementById('uploadArea');
          const fileStatus = document.getElementById('fileStatus');
          const resumeFileInput = document.getElementById('resumeFile');
          if (usePersonalProfile) {
            // Hide upload and clear any selected file
            if (uploadArea) uploadArea.style.display = 'none';
            if (resumeFileInput) {
              resumeFileInput.value = '';
              uploadedResume = null;
            }
            if (fileStatus) fileStatus.innerHTML = '<div class="info">Using personal profile (portfolio.txt)</div>';
          } else {
            if (uploadArea) uploadArea.style.display = 'block';
            if (fileStatus) fileStatus.innerHTML = '';
          }
          updateAnalyzeButton();
        });
      }
      if (clearDataBtn) clearDataBtn.addEventListener('click', clearExtractedData);
      if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearAllHistory);


      // Tab navigation with null checks
      document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn && btn.dataset && btn.dataset.tab) {
          btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
        }
      });

      // Load and display history
      loadHistory();

      // Test connection on load
      testConnection();
    }

    // Set current URL as last active URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.storage.local.set({ lastActiveUrl: tab.url });

  } catch (initError) {
    console.error('Extension initialization error:', initError);
  }
});

// Initialize event listeners for the analysis interface
// Called on initial load and after refresh button detects a supported job site
function initializeEventListeners() {
  const extractDataBtn = document.getElementById('extractData');
  const resumeFileInput = document.getElementById('resumeFile');
  const analyzeBtnEl = document.getElementById('analyzeBtn');
  const usePersonalProfileToggle = document.getElementById('usePersonalProfileToggle');
  const clearDataBtn = document.getElementById('clearData');
  const clearHistoryBtn = document.getElementById('clearHistory');

  // Remove existing listeners to prevent duplicates (using cloneNode trick)
  if (extractDataBtn && !extractDataBtn.dataset.initialized) {
    extractDataBtn.addEventListener('click', extractJobData);
    extractDataBtn.dataset.initialized = 'true';
  }

  if (resumeFileInput && !resumeFileInput.dataset.initialized) {
    resumeFileInput.addEventListener('change', handleFileUpload);
    resumeFileInput.dataset.initialized = 'true';
  }

  if (analyzeBtnEl && !analyzeBtnEl.dataset.initialized) {
    analyzeBtnEl.addEventListener('click', analyzeResume);
    analyzeBtnEl.dataset.initialized = 'true';
  }

  if (usePersonalProfileToggle && !usePersonalProfileToggle.dataset.initialized) {
    usePersonalProfileToggle.addEventListener('change', (e) => {
      usePersonalProfile = e.target.checked;
      const uploadArea = document.getElementById('uploadArea');
      const fileStatus = document.getElementById('fileStatus');
      const resumeFileInput = document.getElementById('resumeFile');
      if (usePersonalProfile) {
        if (uploadArea) uploadArea.style.display = 'none';
        if (resumeFileInput) {
          resumeFileInput.value = '';
          uploadedResume = null;
        }
        if (fileStatus) fileStatus.innerHTML = '<div class="info">Using personal profile (portfolio.txt)</div>';
      } else {
        if (uploadArea) uploadArea.style.display = 'block';
        if (fileStatus) fileStatus.innerHTML = '';
      }
      updateAnalyzeButton();
    });
    usePersonalProfileToggle.dataset.initialized = 'true';
  }

  if (clearDataBtn && !clearDataBtn.dataset.initialized) {
    clearDataBtn.addEventListener('click', clearExtractedData);
    clearDataBtn.dataset.initialized = 'true';
  }

  if (clearHistoryBtn && !clearHistoryBtn.dataset.initialized) {
    clearHistoryBtn.addEventListener('click', clearAllHistory);
    clearHistoryBtn.dataset.initialized = 'true';
  }

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn && btn.dataset && btn.dataset.tab && !btn.dataset.initialized) {
      btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
      btn.dataset.initialized = 'true';
    }
  });

  // Load and display history
  loadHistory();

  // Test connection
  testConnection();
}

// Check if current page is a supported job site (LinkedIn or Naukri)
async function checkIfSupportedJobSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab.url && (tab.url.includes('linkedin.com') || tab.url.includes('naukri.com'));
  } catch (error) {
    console.error('Error checking supported job site:', error);
    return false;
  }
}

// Get current site name from URL
function getCurrentSiteName(url) {
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('naukri.com')) return 'Naukri';
  return 'Unknown';
}

// Show analysis interface for supported job sites
function showAnalysisInterface() {
  const mainContent = document.querySelector('.main-content');
  const resultArea = document.querySelector('.result-area');

  if (mainContent) {
    mainContent.style.display = 'block';
  }

  // Remove the unsupported site message if it exists
  if (resultArea) {
    const unsupportedMessage = resultArea.querySelector('.linkedin-only-message');
    if (unsupportedMessage) {
      unsupportedMessage.remove();
    }
    // Restore original instruction if empty
    if (!resultArea.querySelector('.instruction')) {
      resultArea.innerHTML = '<p class="instruction">Navigate to a job page on LinkedIn or Naukri and follow the steps above to analyze your resume match.</p>';
    }
  }
}

// Show supported sites message
function showSupportedSitesMessage() {
  const mainContent = document.querySelector('.main-content');
  const resultArea = document.querySelector('.result-area');

  if (mainContent) {
    mainContent.style.display = 'none';
  }

  if (resultArea) {
    resultArea.innerHTML = `
      <div class="linkedin-only-message">
        <div class="message-icon">💼</div>
        <h3>Supported Job Sites Only</h3>
        <p>This extension works with LinkedIn and Naukri job pages.</p>
        <p>Please navigate to one of these sites to use the resume analysis features.</p>
        <div class="linkedin-links">
          <button onclick="openLinkedInJobs()" class="linkedin-btn">
            🔍 LinkedIn Jobs
          </button>
          <button onclick="openNaukriJobs()" class="linkedin-btn" style="margin-left: 10px;">
            🔍 Naukri Jobs
          </button>
        </div>
      </div>
    `;
  }
}

// Open LinkedIn jobs page
function openLinkedInJobs() {
  chrome.tabs.create({ url: 'https://www.linkedin.com/jobs/' });
}

// Open Naukri jobs page
function openNaukriJobs() {
  chrome.tabs.create({ url: 'https://www.naukri.com/' });
}

// Listen for tab updates to refresh interface when user navigates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Get the active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Only update if this is the active tab
    if (activeTab && activeTab.id === tabId) {
      const isSupportedSite = tab.url && (tab.url.includes('linkedin.com') || tab.url.includes('naukri.com'));

      if (isSupportedSite) {
        showAnalysisInterface();
        await refreshStateForCurrentTab();
      } else {
        showSupportedSitesMessage();
      }
    }
  }
});

// Function to refresh extension state based on current tab
async function refreshStateForCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.storage.local.get(['analysisData', 'lastActiveUrl']);

    console.log('Current tab URL:', tab.url);
    console.log('Last active URL:', result.lastActiveUrl);

    // Always update last active URL
    await chrome.storage.local.set({ lastActiveUrl: tab.url });

    // Clear current global state first
    extractedJobData = null;
    uploadedResume = null;

    // For supported job sites, just clear UI for fresh start - don't auto-load analysis
    if (tab.url.includes('linkedin.com') || tab.url.includes('naukri.com')) {
      clearUIForFreshStart();
    } else {
      // Load state from chrome storage for non-supported pages (legacy support)
      const analysisData = result.analysisData || {};
      if (analysisData[tab.url]) {
        const savedData = analysisData[tab.url];
        extractedJobData = savedData.jobData;

        console.log('Loading saved data from storage for URL:', tab.url);
        displayJobData(extractedJobData);
        updateAnalyzeButton();
        showClearButton();

        if (savedData.analysisResult) {
          displayAnalysisResults(savedData.analysisResult);
        }
      } else {
        clearUIForFreshStart();
      }
    }
  } catch (error) {
    console.log('Error refreshing state:', error);
  }
}

// Check if analysis exists on server for current URL
async function checkExistingAnalysis(url) {
  try {
    const response = await fetch(API_BASE_URL + API_ENDPOINTS.checkAnalysis, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url })
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success && result.data.exists) {
        displayExistingAnalysis(result.data.info, url);
      } else {
        // No existing analysis, clear UI
        clearUIForFreshStart();
      }
    }
  } catch (error) {
    console.log('Error checking existing analysis:', error);
    clearUIForFreshStart();
  }
}

// Display existing analysis information
function displayExistingAnalysis(analysisInfo, url) {
  const resultDiv = document.getElementById('result');

  const lastAnalyzed = new Date(analysisInfo.lastAnalyzed).toLocaleString();
  const aiText = analysisInfo.aiEnabled ? '🤖 AI Enhanced' : '📖 Dictionary Based';
  const methodText = analysisInfo.analysisMethod || 'standard';

  resultDiv.innerHTML = `
    <div class="existing-analysis">
      <h3>📊 Previous Analysis Found</h3>
      <div class="analysis-info">
        <div class="info-row">
          <span class="label">Match Score:</span>
          <span class="value match-score ${getScoreClass(analysisInfo.matchScore)}">${analysisInfo.matchScore}%</span>
        </div>
        <div class="info-row">
          <span class="label">Analyzed:</span>
          <span class="value">${lastAnalyzed}</span>
        </div>
        <div class="info-row">
          <span class="label">Method:</span>
          <span class="value">${aiText} (${methodText})</span>
        </div>
      </div>
      <div class="analysis-actions">
        <button class="action-btn primary" onclick="loadExistingAnalysis('${url}')">
          📂 View Analysis
        </button>
        <button class="action-btn secondary" onclick="startReanalysis('${url}')">
          🔄 Re-analyze
        </button>
        <button class="action-btn danger" onclick="deleteExistingAnalysis('${url}')">
          🗑️ Delete
        </button>
      </div>
    </div>
  `;
}

// Load existing analysis from server
async function loadExistingAnalysis(url) {
  try {
    showLoading('Loading previous analysis...');

    const response = await fetch(API_BASE_URL + API_ENDPOINTS.getAnalysis, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url })
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success) {
        // Display the loaded analysis
        displayAnalysisResults(result.data.analysis);

        // Show metadata
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `
          <div class="loaded-analysis">
            <h3>📂 Loaded Analysis</h3>
            <p class="metadata">
              Analyzed: ${new Date(result.data.metadata.analyzedAt).toLocaleString()}
              ${result.data.analysis.metadata?.aiEnabled ? ' • 🤖 AI Enhanced' : ' • 📖 Dictionary Based'}
            </p>
            <button class="action-btn secondary" onclick="startReanalysis('${url}')">
              🔄 Re-analyze Job
            </button>
          </div>
        `;

        showClearButton();
      }
    } else {
      showError('Failed to load previous analysis');
    }
  } catch (error) {
    showError('Error loading analysis: ' + error.message);
  }
}

// Start reanalysis process
function startReanalysis(url) {
  // Clear existing analysis display
  const resultsSectionEl = document.getElementById('resultsSection');
  if (resultsSectionEl) {
    resultsSectionEl.style.display = 'none';
  }

  // Clear result div and show fresh start
  clearUIForFreshStart();

  showSuccessMessage('Ready for new analysis! Extract job data to begin.');
}

// Delete existing analysis
async function deleteExistingAnalysis(url) {
  if (!confirm('Are you sure you want to delete the existing analysis for this job?')) {
    return;
  }

  try {
    showLoading('Deleting analysis...');

    const response = await fetch(API_BASE_URL + API_ENDPOINTS.deleteAnalysis, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url })
    });

    if (response.ok) {
      const result = await response.json();

      if (result.success && result.data.deleted) {
        showSuccessMessage('Analysis deleted successfully!');
        // Clear UI for fresh start
        setTimeout(() => {
          clearUIForFreshStart();
        }, 1500);
      } else {
        showError('Analysis not found or already deleted');
      }
    } else {
      showError('Failed to delete analysis');
    }
  } catch (error) {
    showError('Error deleting analysis: ' + error.message);
  }
}

// Clear UI for fresh start
function clearUIForFreshStart() {
  const resultEl = document.getElementById('result');
  const resultsSectionEl = document.getElementById('resultsSection');
  const clearDataEl = document.getElementById('clearData');
  const fileStatusEl = document.getElementById('fileStatus');
  const resumeFileEl = document.getElementById('resumeFile');
  const usePersonalProfileToggle = document.getElementById('usePersonalProfileToggle');
  const uploadArea = document.getElementById('uploadArea');

  if (resultEl) resultEl.innerHTML = '';
  if (resultsSectionEl) resultsSectionEl.style.display = 'none';
  if (clearDataEl) clearDataEl.style.display = 'none';
  if (fileStatusEl) fileStatusEl.innerHTML = '';
  if (resumeFileEl) resumeFileEl.value = '';
  if (usePersonalProfileToggle) {
    usePersonalProfileToggle.checked = false;
    usePersonalProfile = false;
  }
  if (uploadArea) uploadArea.style.display = 'block';

  // Remove any existing analysis class markers
  document.querySelectorAll('.existing-analysis, .loaded-analysis').forEach(el => el.remove());

  updateAnalyzeButton();
}

// Function to extract job data
async function extractJobData() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we're on a supported job site
    const isLinkedIn = tab.url.includes('linkedin.com');
    const isNaukri = tab.url.includes('naukri.com');

    if (!isLinkedIn && !isNaukri) {
      showError('Please navigate to a LinkedIn or Naukri job page first.');
      return;
    }

    const siteName = isLinkedIn ? 'LinkedIn' : 'Naukri';
    showLoading(`Analyzing ${siteName} page...`);

    // Use executeScript to directly extract data without separate content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Get current site
        const isLinkedInSite = window.location.hostname.includes('linkedin.com');
        const isNaukriSite = window.location.hostname.includes('naukri.com');

        // Check if we're on a job page
        function isJobPage() {
          if (isLinkedInSite) {
            const urlChecks = [
              window.location.href.includes('/jobs/view/'),
              window.location.pathname.includes('/jobs/view/'),
              window.location.href.includes('/jobs/collections/'),
              window.location.href.includes('currentJobId=')
            ];

            const elementChecks = [
              document.querySelector('.jobs-unified-top-card'),
              document.querySelector('[data-job-id]'),
              document.querySelector('.jobs-search__job-details'),
              document.querySelector('.job-details-jobs-unified-top-card'),
              document.querySelector('.jobs-details')
            ];

            return urlChecks.some(check => check) || elementChecks.some(el => el !== null);
          } else if (isNaukriSite) {
            return window.location.pathname.includes('/job-listings-') ||
              document.querySelector('[class^="styles_jd-header-title"]') !== null ||
              document.querySelector('[class^="styles_job-desc-container"]') !== null;
          }
          return false;
        }

        // Extract LinkedIn job title
        function extractLinkedInJobTitle() {
          const selectors = [
            '.jobs-unified-top-card__job-title h1',
            '.jobs-unified-top-card__job-title a',
            '.jobs-unified-top-card h1',
            '.job-details-jobs-unified-top-card__job-title h1',
            'h1[data-test-id="job-title"]',
            '.jobs-details__main-content h1',
            '.job-view-layout h1',
            '.jobs-search__job-details h1',
            '.job-details__job-title h1',
            '.artdeco-entity-lockup__title'
          ];

          for (const selector of selectors) {
            try {
              const element = document.querySelector(selector);
              if (element && element.textContent && element.textContent.trim()) {
                const title = element.textContent.trim();
                if (title.length > 2 && !title.toLowerCase().includes('sign in')) {
                  return title;
                }
              }
            } catch (error) {
              continue;
            }
          }

          return 'Job title not found';
        }

        // Extract Naukri job title
        function extractNaukriJobTitle() {
          const selectors = [
            '[class^="styles_jd-header-title"] h1',
            '[class^="styles_jd-header-title"]',
            'h1[class*="jd-header-title"]',
            '.jd-header-title h1',
            'h1'
          ];

          for (const selector of selectors) {
            try {
              const element = document.querySelector(selector);
              if (element && element.textContent && element.textContent.trim()) {
                const title = element.textContent.trim();
                if (title.length > 3 && !title.toLowerCase().includes('naukri') && !title.toLowerCase().includes('jobs')) {
                  return title;
                }
              }
            } catch (error) {
              continue;
            }
          }

          return 'Job title not found';
        }

        // Extract LinkedIn job description
        function extractLinkedInJobDescription() {
          const selectors = [
            '.jobs-description-content__text',
            '.jobs-description__content',
            '.jobs-description',
            '.job-details__job-description',
            '.jobs-box__html-content'
          ];

          for (const selector of selectors) {
            try {
              const element = document.querySelector(selector);
              if (element) {
                const text = (element.innerText || element.textContent || '').trim();
                if (text.length > 50 && !text.toLowerCase().includes('sign in')) {
                  return text;
                }
              }
            } catch (error) {
              continue;
            }
          }

          return 'Job description not found';
        }

        // Extract Naukri job description (including key skills)
        function extractNaukriJobDescription() {
          let fullDescription = '';

          // 1. Get main job description
          const descSelectors = [
            '[class^="styles_job-desc-container"]',
            '[class*="job-desc-container"]',
            '.job-desc',
            '[class^="styles_JDC"]',
            '.jd-container',
            'section[class*="job-desc"]'
          ];

          for (const selector of descSelectors) {
            try {
              const element = document.querySelector(selector);
              if (element) {
                const text = (element.innerText || element.textContent || '').trim();
                if (text.length > 50) {
                  fullDescription = text;
                  break;
                }
              }
            } catch (error) {
              continue;
            }
          }

          // 2. Extract Key Skills from chips inside the key-skill container
          let keySkillsText = '';
          try {
            // Find the key-skill container
            const keySkillContainer = document.querySelector('[class*="key-skill"]');
            console.log('Key skill container found:', !!keySkillContainer);

            if (keySkillContainer) {
              // Get all chip elements inside the container
              const chips = keySkillContainer.querySelectorAll('[class*="chip"]');
              console.log('Chips found:', chips.length);

              if (chips.length > 0) {
                const skills = Array.from(chips)
                  .map(chip => chip.innerText.trim())
                  .filter(s => s.length > 0 && s.length < 50);
                console.log('Extracted skills:', skills);

                if (skills.length > 0) {
                  keySkillsText = '\n\nKey Skills: ' + [...new Set(skills)].join(', ');
                }
              }
            }

            // Fallback: find all chips on page if container not found
            if (!keySkillsText) {
              const allChips = document.querySelectorAll('[class*="chip"]');
              console.log('Fallback: All chips on page:', allChips.length);

              if (allChips.length > 0) {
                const skills = Array.from(allChips)
                  .map(chip => chip.innerText.trim())
                  .filter(s => s.length > 0 && s.length < 50 && !s.includes('\n'));
                console.log('Fallback extracted skills:', skills);

                if (skills.length > 0) {
                  keySkillsText = '\n\nKey Skills: ' + [...new Set(skills)].join(', ');
                }
              }
            }
          } catch (e) {
            console.error('Key skills extraction error:', e);
          }

          console.log('Final keySkillsText:', keySkillsText);

          // Combine description with key skills
          fullDescription = fullDescription + keySkillsText;

          console.log('Full description length:', fullDescription.length);

          return fullDescription.length > 50 ? fullDescription : 'Job description not found';
        }

        // Main extraction
        function extractJobTitle() {
          if (isLinkedInSite) return extractLinkedInJobTitle();
          if (isNaukriSite) return extractNaukriJobTitle();
          return 'Job title not found';
        }

        function extractJobDescription() {
          if (isLinkedInSite) return extractLinkedInJobDescription();
          if (isNaukriSite) return extractNaukriJobDescription();
          return 'Job description not found';
        }

        const siteName = isLinkedInSite ? 'LinkedIn' : (isNaukriSite ? 'Naukri' : 'Unknown');
        console.log('Direct extraction started on:', window.location.href, '| Site:', siteName);
        console.log('Is job page check:', isJobPage());

        if (!isJobPage()) {
          return {
            success: false,
            error: `Not on a ${siteName} job page. Please navigate to a job posting.`,
            debug: { url: window.location.href }
          };
        }

        try {
          const jobTitle = extractJobTitle();
          const jobDescription = extractJobDescription();

          console.log('Extracted title:', jobTitle);
          console.log('Extracted description length:', jobDescription.length);

          if (jobTitle === 'Job title not found' && jobDescription === 'Job description not found') {
            return {
              success: false,
              error: 'Could not find job content. Please wait for the page to fully load and try again.',
              debug: {
                url: window.location.href,
                site: siteName,
                pageState: {
                  readyState: document.readyState,
                  elementsFound: {
                    jobCards: document.querySelectorAll('[class*="job"]').length,
                    descriptions: document.querySelectorAll('[class*="description"]').length,
                    titles: document.querySelectorAll('h1, h2').length
                  }
                }
              }
            };
          }

          return {
            success: true,
            data: {
              title: jobTitle,
              description: jobDescription,
              url: window.location.href,
              source: siteName.toLowerCase(),
              timestamp: new Date().toISOString()
            }
          };

        } catch (extractionError) {
          console.error('Extraction error:', extractionError);
          return {
            success: false,
            error: 'Error extracting job data: ' + extractionError.message,
            debug: { error: extractionError.toString() }
          };
        }
      }
    });

    if (results && results[0] && results[0].result) {
      const jobData = results[0].result;

      if (jobData.success) {
        extractedJobData = jobData.data;

        // Save data per URL for tab-specific persistence
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const result = await chrome.storage.local.get(['analysisData']);
        const analysisData = result.analysisData || {};

        analysisData[tab.url] = {
          jobData: extractedJobData,
          extractedAt: new Date().toISOString()
        };

        await chrome.storage.local.set({ analysisData });

        displayJobData(jobData.data);
        updateAnalyzeButton();
        showClearButton();
      } else {
        showError(jobData.error || 'Failed to extract job data from this page');
        console.log('Debug info:', jobData.debug);
      }
    } else {
      showError('No data received from page');
    }

  } catch (error) {
    console.error('Extract job data error:', error);

    if (error.message.includes('Cannot access')) {
      showErrorState(
        'Page Access Error',
        'Cannot access page content due to security restrictions.',
        'Please ensure you are on a job page and try refreshing.',
        true
      );
    } else {
      showErrorState(
        'Extraction Failed',
        error.message || 'Unknown error occurred',
        'Please try refreshing the page and try again.',
        true
      );
    }
  }
}

// Handle file upload
function handleFileUpload(event) {
  const file = event.target.files[0];
  const statusDiv = document.getElementById('fileStatus');

  if (!file) {
    uploadedResume = null;
    statusDiv.innerHTML = '';
    updateAnalyzeButton();
    return;
  }

  // Validate file type
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  const allowedExtensions = ['.pdf', '.docx', '.txt'];

  const isValidType = allowedTypes.includes(file.type) ||
    allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

  if (!isValidType) {
    statusDiv.innerHTML = '<div class="error">Please select a PDF, DOCX, or TXT file.</div>';
    uploadedResume = null;
    updateAnalyzeButton();
    return;
  }

  // Validate file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    statusDiv.innerHTML = '<div class="error">File size must be less than 10MB.</div>';
    uploadedResume = null;
    updateAnalyzeButton();
    return;
  }

  uploadedResume = file;
  statusDiv.innerHTML = `
    <div class="file-info">
      <span class="file-name">FILE: ${file.name}</span>
      <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
    </div>
  `;

  updateAnalyzeButton();
}

// Update analyze button state
function updateAnalyzeButton() {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const canAnalyze = extractedJobData && (uploadedResume || usePersonalProfile);

  if (!analyzeBtn) {
    // Button not present (e.g., non-LinkedIn page view); safely skip
    return;
  }

  analyzeBtn.disabled = !canAnalyze;
  analyzeBtn.textContent = canAnalyze
    ? (usePersonalProfile ? 'Analyze with Personal Profile' : 'Analyze Resume Match')
    : 'Need Job Data & Resume';
}

// Read file content based on file type
async function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        if (file.type === 'text/plain') {
          // Plain text file
          resolve(e.target.result);
        } else if (file.type === 'application/pdf') {
          // For PDF files, we'll send the binary data to backend for processing
          resolve({
            type: 'pdf',
            data: e.target.result, // ArrayBuffer
            filename: file.name
          });
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // For DOCX files, we'll send the binary data to backend for processing
          resolve({
            type: 'docx',
            data: e.target.result, // ArrayBuffer
            filename: file.name
          });
        } else {
          // Fallback to text
          reader.readAsText(file);
          resolve(e.target.result);
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Read file based on type
    if (file.type === 'text/plain') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Send data to backend API with enhanced matching
async function sendToBackendAPI(jobData, resumeContent, forceRerun = false) {
  const apiUrl = API_BASE_URL + API_ENDPOINTS.enhanced; // Use enhanced endpoint

  // Prepare payload
  const payload = {
    jobData: {
      title: jobData.title,
      description: jobData.description,
      url: jobData.url,
      timestamp: jobData.timestamp
    },
    usePersonalProfile: usePersonalProfile === true,
    resume: {
      content: typeof resumeContent === 'string' ? resumeContent : null,
      filename: uploadedResume ? uploadedResume.name : 'portfolio.txt',
      fileType: uploadedResume ? uploadedResume.type : 'text/plain',
      fileSize: uploadedResume ? uploadedResume.size : 0
    },
    forceRerun: forceRerun // Add force rerun flag
  };

  // If resume is binary data (PDF/DOCX), add base64 data
  if (resumeContent && typeof resumeContent === 'object' && resumeContent.data) {
    payload.resume.binaryData = arrayBufferToBase64(resumeContent.data);
    payload.resume.fileType = resumeContent.type;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error?.message || errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || result.message || 'Analysis failed');
    }

    return result;

  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend server. Please ensure the API server is running.');
    }
    throw error;
  }
}

/**
 * Send request to backend using SSE (Server-Sent Events) for streaming progress
 * This prevents timeout errors during slow local AI analysis
 */
async function sendToBackendAPIStream(jobData, resumeContent, forceRerun = false, onProgress = null) {
  const apiUrl = API_BASE_URL + API_ENDPOINTS.stream;

  // Prepare payload
  const payload = {
    jobData: {
      title: jobData.title,
      description: jobData.description,
      url: jobData.url,
      timestamp: jobData.timestamp
    },
    usePersonalProfile: usePersonalProfile === true,
    resume: {
      content: typeof resumeContent === 'string' ? resumeContent : null,
      filename: uploadedResume ? uploadedResume.name : 'portfolio.txt',
      fileType: uploadedResume ? uploadedResume.type : 'text/plain',
      fileSize: uploadedResume ? uploadedResume.size : 0
    },
    forceRerun: forceRerun
  };

  // If resume is binary data (PDF/DOCX), add base64 data
  if (resumeContent && typeof resumeContent === 'object' && resumeContent.data) {
    payload.resume.binaryData = arrayBufferToBase64(resumeContent.data);
    payload.resume.fileType = resumeContent.type;
  }

  return new Promise((resolve, reject) => {
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(payload)
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));

                if (eventData.type === 'progress') {
                  // Update UI with progress
                  if (onProgress) {
                    onProgress(eventData);
                  }
                  showLoading(eventData.message, `${eventData.percentage || 0}% complete`);
                } else if (eventData.type === 'result') {
                  // Final result received
                  resolve(eventData);
                } else if (eventData.type === 'error') {
                  reject(new Error(eventData.message));
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE event:', line, parseError);
              }
            }
          }
        }
      })
      .catch(error => {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          reject(new Error('Cannot connect to backend server. Please ensure the API server is running.'));
        } else {
          reject(error);
        }
      });
  });
}

// Analyze resume match with backend API
async function analyzeResume(forceRerun = false) {
  if (!extractedJobData || (!uploadedResume && !usePersonalProfile)) {
    showError('Please extract job data and choose a resume source (upload or personal profile).');
    return;
  }

  console.log('Starting analyze function with forceRerun:', forceRerun);

  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.disabled = true;
  }

  // Show analyzing state
  showAnalyzingState();

  try {
    // If not forcing a rerun, check for existing analysis first
    if (!forceRerun) {
      console.log('Checking for existing analysis...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      // When using personal profile, treat it as a virtual resume file
      const currentResumeRef = usePersonalProfile ? { name: 'portfolio.txt', size: 0 } : uploadedResume;
      const existingAnalysis = await checkAndLoadExistingAnalysis(tab.url, currentResumeRef);

      if (existingAnalysis) {
        console.log('Found and loaded existing analysis, stopping here');
        analyzeBtn.disabled = false;
        updateAnalyzeButton();
        return; // Exit early as we've loaded existing analysis
      } else {
        console.log('No existing analysis found or resume changed, proceeding with fresh analysis');
      }
    } else {
      console.log('Force rerun requested, skipping existing analysis check');
    }

    // Proceed with fresh analysis
    console.log('Starting fresh analysis...');
    await performFreshAnalysis(forceRerun);

  } catch (error) {
    console.error('Analysis failed:', error);
    handleAnalysisError(error);
  } finally {
    if (analyzeBtn) {
      analyzeBtn.disabled = false;
      updateAnalyzeButton();
    }
  }
}

// Check for existing analysis and load if resume matches
async function checkAndLoadExistingAnalysis(url, currentResume) {
  try {
    showLoading('Checking for existing analysis...', 'Looking for previous analysis results');

    // First check if there's an analysis for this specific resume
    let resumeInfo = null;
    if (usePersonalProfile) {
      resumeInfo = { filename: 'portfolio.txt', fileSize: 0 };
    } else if (currentResume) {
      resumeInfo = { filename: currentResume.name, fileSize: currentResume.size };
    }

    // Only attempt specific check if we have a resume reference
    if (resumeInfo) {
      const specificResponse = await fetch(API_BASE_URL + API_ENDPOINTS.checkAnalysis, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          resumeInfo: resumeInfo
        })
      });

      if (specificResponse.ok) {
        const specificResult = await specificResponse.json();

        console.log('Specific analysis check result:', specificResult);

        if (specificResult?.success && specificResult?.data?.exists) {
          console.log('Found existing analysis for this exact resume, loading data...');

          // Load the specific analysis
          const analysisResponse = await fetch(API_BASE_URL + API_ENDPOINTS.getAnalysis, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: url,
              resumeInfo: resumeInfo
            })
          });

          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();

            console.log('Loaded specific analysis data:', analysisData);

            if (analysisData?.success && analysisData?.data) {
              // Display existing analysis with rerun option
              console.log('Displaying stored analysis results for exact resume match');
              displayStoredAnalysisResults(analysisData.data, specificResult.data.info);
              return true;
            }
          }
        }
      }
    }

    // If no specific analysis found, check for other analyses for this job
    const generalResponse = await fetch(API_BASE_URL + API_ENDPOINTS.checkAnalysis, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url })
    });

    if (generalResponse.ok) {
      const generalResult = await generalResponse.json();

      console.log('General analysis check result:', generalResult);

      if (generalResult?.success && generalResult?.data?.exists && generalResult?.data?.count > 0) {
        console.log(`Found ${generalResult.data.count} existing analyses for this job with different resumes`);

        // Show info about available analyses
        const currentResumeDisplay = usePersonalProfile ? { name: 'portfolio.txt' } : currentResume;
        showAvailableAnalyses(generalResult?.data?.analyses || [], currentResumeDisplay);
        return false; // Don't auto-load, let user choose
      }
    }

    console.log('No existing analysis found for current resume');
    return false;

  } catch (error) {
    console.error('Error checking existing analysis:', error);
    return false;
  }
}

// Show available analyses for the current job
function showAvailableAnalyses(analyses, currentResume) {
  const resultEl = document.getElementById('result');
  const resultsSectionEl = document.getElementById('resultsSection');

  const html = `
    <div class="available-analyses">
      <div class="info-banner">
        <h3>📊 Previous Analyses Available</h3>
        <p>Found ${analyses.length} previous analysis${analyses.length > 1 ? 'es' : ''} for this job with different resumes:</p>
      </div>
      
      <div class="analyses-list">
        ${analyses.map((analysis, index) => `
          <div class="analysis-item">
            <div class="analysis-header">
              <span class="resume-name">📄 ${analysis.resumeInfo?.filename || 'Unknown Resume'}</span>
              <span class="match-score ${getScoreClass(analysis.matchScore)}">${analysis.matchScore}% Match</span>
            </div>
            <div class="analysis-meta">
              <span>📅 ${new Date(analysis.timestamp).toLocaleDateString()}</span>
              <span>📊 ${analysis.resumeInfo?.fileSize ? Math.round(analysis.resumeInfo.fileSize / 1024) + 'KB' : 'Unknown size'}</span>
            </div>
            <button class="load-analysis-btn" onclick="loadSpecificAnalysis('${analysis.filename}')">
              View Analysis
            </button>
          </div>
        `).join('')}
      </div>
      
      <div class="current-resume-info">
        <h4>Current Resume: ${currentResume.name}</h4>
        <p>Continue with fresh analysis for your current resume, or view a previous analysis above.</p>
      </div>
    </div>
  `;

  resultEl.innerHTML = html;
  resultsSectionEl.style.display = 'block';
}

function getScoreClass(score) {
  if (score >= 80) return 'score-excellent';
  if (score >= 60) return 'score-good';
  if (score >= 40) return 'score-moderate';
  return 'score-poor';
}

// Load and display a specific analysis
async function loadSpecificAnalysis(filename) {
  try {
    showLoading('Loading selected analysis...', 'Retrieving saved analysis data');

    // Extract URL from the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Get all analyses for this job and find the specific one
    const response = await fetch(API_BASE_URL + API_ENDPOINTS.getAnalysis, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: tab.url })
    });

    if (response.ok) {
      const result = await response.json();

      if (result?.success && result?.data?.analyses) {
        // Find the specific analysis by filename
        const specificAnalysis = result.data.analyses.find(a => a.metadata && a.metadata.filename === filename);

        if (specificAnalysis) {
          console.log('Loading specific analysis:', filename);
          displayStoredAnalysisResults(specificAnalysis, specificAnalysis.metadata);
        } else {
          showError('Analysis not found');
        }
      } else {
        showError('Failed to load analysis');
      }
    } else {
      showError('Failed to retrieve analysis');
    }
  } catch (error) {
    console.error('Error loading specific analysis:', error);
    showError('Error loading analysis: ' + error.message);
  }
}

// Perform fresh analysis (extracted from original analyzeResume function)
async function performFreshAnalysis(forceRerun = false) {
  // Validate job description
  if (!validateJobData(extractedJobData)) {
    throw new Error('MISSING_JOB_DATA');
  }

  let resumeContent = null;
  if (!usePersonalProfile) {
    // Validate file format before processing
    if (!validateResumeFile(uploadedResume)) {
      throw new Error('UNSUPPORTED_FORMAT');
    }
    showLoading('Reading resume file...');
    // Read file content with error handling
    try {
      resumeContent = await readFileContent(uploadedResume);
    } catch (fileError) {
      throw new Error('FILE_PROCESSING_ERROR');
    }
    // Validate resume content
    if (!resumeContent || (typeof resumeContent === 'string' && resumeContent.trim().length === 0)) {
      throw new Error('EMPTY_RESUME');
    }
  } else {
    // Personal profile selected; backend will load content
    showLoading('Using personal profile for analysis...');
  }

  showLoading('Sending to AI for analysis...');

  // Use streaming endpoint for real-time progress updates (prevents timeout)
  const apiResponse = await sendToBackendAPIStream(
    extractedJobData,
    resumeContent,
    forceRerun,
    (progress) => {
      console.log('Analysis progress:', progress);
    }
  );

  // Validate API response
  if (!apiResponse || !apiResponse.success) {
    throw new Error('API_RESPONSE_ERROR');
  }

  // Check if this is a cached response
  if (apiResponse.metadata?.isFromCache) {
    console.log('Received cached response from backend');
    displayStoredAnalysisResults({
      analysis: apiResponse,
      metadata: {
        analyzedAt: apiResponse.metadata.cacheTimestamp
      }
    }, {
      lastAnalyzed: apiResponse.metadata.cacheTimestamp,
      aiEnabled: apiResponse.metadata.aiEnabled,
      analysisMethod: apiResponse.metadata.analysisMethod
    });
    return;
  }

  // Display fresh results
  displayAnalysisResults(apiResponse);

  // Save analysis result with the job data for this specific URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const result = await chrome.storage.local.get(['analysisData']);
  const analysisData = result.analysisData || {};

  if (analysisData[tab.url]) {
    analysisData[tab.url].analysisResult = apiResponse;
    analysisData[tab.url].analyzedAt = new Date().toISOString();
    await chrome.storage.local.set({ analysisData });
  }
}

// Display stored analysis results with rerun option
function displayStoredAnalysisResults(analysisData, analysisInfo) {
  try {
    console.log('Displaying stored analysis results:', { analysisData, analysisInfo });
    if (!analysisData || typeof analysisData !== 'object') {
      showErrorState(
        'Invalid Stored Analysis',
        'Stored analysis data is missing or malformed.',
        'Please run a fresh analysis.'
      );
      return;
    }

    // Display the analysis results
    displayAnalysisResults(analysisData.analysis);

    // Add stored analysis indicator with rerun button
    const resultDiv = document.getElementById('result');
    const analyzedTs = analysisInfo?.lastAnalyzed || analysisInfo?.analyzedAt || analysisData?.analysis?.timestamp;
    const lastAnalyzed = analyzedTs ? new Date(analyzedTs).toLocaleString() : 'Unknown';
    const aiEnabled = (analysisInfo && typeof analysisInfo.aiEnabled !== 'undefined')
      ? analysisInfo.aiEnabled
      : (analysisData?.analysis?.metadata?.aiEnabled ?? false);
    const aiText = aiEnabled ? '🤖 AI Enhanced' : '📖 Non‑AI Analysis';
    const methodText = analysisInfo?.analysisMethod || analysisData?.analysis?.metadata?.analysisMethod || 'standard';

    // Get match score from the analysis data
    let matchScore = 0;
    if (analysisData.analysis?.data?.matchScore?.overall) {
      matchScore = Math.round(analysisData.analysis.data.matchScore.overall);
    } else if (analysisData.analysis?.analysis?.matchPercentage) {
      matchScore = analysisData.analysis.analysis.matchPercentage;
    }

    resultDiv.innerHTML = `
      <div class="stored-analysis-info">
        <div class="stored-indicator">
          <h4>📂 Showing Stored Analysis</h4>
          <div class="analysis-metadata">
            <span class="metadata-item">📅 ${lastAnalyzed}</span>
            <span class="metadata-item">${aiText}</span>
            <span class="metadata-item">📊 ${matchScore}% match</span>
            <span class="metadata-item">📄 Same resume file</span>
            <span class="metadata-item">⚙️ ${methodText}</span>
          </div>
        </div>
        <div class="rerun-section">
          <button class="rerun-btn" id="rerunAnalysisBtn">
            🔄 Run Fresh Analysis
          </button>
          <small class="rerun-note">Click to perform new analysis with current data</small>
        </div>
      </div>
    `;

    // Attach event listener for rerun button (CSP doesn't allow inline onclick)
    const rerunBtn = document.getElementById('rerunAnalysisBtn');
    if (rerunBtn) {
      rerunBtn.addEventListener('click', rerunAnalysis);
    }

    // Save to history
    saveToHistory(extractedJobData, analysisData.analysis);

    // Show results section
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
      resultsSection.style.display = 'block';
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    console.log('Successfully displayed stored analysis results');

  } catch (error) {
    console.error('Error displaying stored results:', error);
    showError('Error displaying stored analysis. Running fresh analysis...');
    performFreshAnalysis();
  }
}

// Rerun analysis function (bypasses stored data)
async function rerunAnalysis() {
  try {
    // Verify prerequisites
    if (!extractedJobData) {
      showError('Job data missing. Please extract job details first.');
      return;
    }
    if (!uploadedResume && !usePersonalProfile) {
      showError('Resume not uploaded. Please upload your resume or select Personal Profile to run fresh analysis.');
      return;
    }

    // Clear the stored analysis indicator
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    // Force a fresh analysis with forceRerun flag
    await analyzeResume(true); // true = forceRerun

  } catch (error) {
    console.error('Rerun analysis failed:', error);
    showError('Failed to rerun analysis. Please try again.');
  }
}

// Comprehensive error handler
function handleAnalysisError(error) {
  const errorCode = error.message;

  switch (errorCode) {
    case 'UNSUPPORTED_FORMAT':
      showErrorState(
        'Unsupported File Format',
        'Please upload a PDF, DOCX, or TXT file.',
        'Try uploading a different file format.'
      );
      break;

    case 'MISSING_JOB_DATA':
      showErrorState(
        'Missing Job Description',
        'Could not extract job information from this page.',
        'Please navigate to a LinkedIn job posting and try again.'
      );
      break;

    case 'FILE_PROCESSING_ERROR':
      showErrorState(
        'File Processing Failed',
        'Unable to read the uploaded resume file.',
        'Try uploading the file again or convert it to a different format.'
      );
      break;

    case 'EMPTY_RESUME':
      showErrorState(
        'Empty Resume Content',
        'The uploaded file appears to be empty or corrupted.',
        'Please check the file and upload again.'
      );
      break;

    case 'API_TIMEOUT':
      showErrorState(
        'Analysis Timeout',
        'The analysis is taking longer than expected.',
        'Please try again. If the problem persists, try a smaller resume file.',
        true // Show retry button
      );
      break;

    case 'API_RESPONSE_ERROR':
      showErrorState(
        'Analysis Failed',
        'The server encountered an error while processing your request.',
        'Please try again in a few moments.',
        true
      );
      break;

    default:
      if (error.message.includes('Cannot connect to backend')) {
        showErrorState(
          'Service Unavailable',
          'Cannot connect to the analysis service.',
          'Please ensure the backend server is running and try again.',
          true
        );
      } else if (error.message.includes('fetch')) {
        showErrorState(
          'Network Error',
          'Unable to reach the analysis service.',
          'Check your internet connection and try again.',
          true
        );
      } else {
        showErrorState(
          'Unexpected Error',
          error.message || 'An unexpected error occurred.',
          'Please try again or contact support if the issue persists.',
          true
        );
      }
  }
}

// Validate resume file
function validateResumeFile(file) {
  if (!file) return false;

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  const allowedExtensions = ['.pdf', '.docx', '.txt'];

  return allowedTypes.includes(file.type) ||
    allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

// Validate job data
function validateJobData(jobData) {
  return jobData &&
    jobData.title &&
    jobData.title.trim().length > 0 &&
    jobData.description &&
    jobData.description.trim().length > 10; // Minimum description length
}

// Show error state with retry option
function showErrorState(title, message, suggestion, showRetry = false) {
  const resultDiv = document.getElementById('result');

  resultDiv.innerHTML = `
    <div class="error-state">
      <h3>[ERROR] ${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="error-suggestion">
        <small>${escapeHtml(suggestion)}</small>
      </div>
      ${showRetry ? `
        <button class="retry-btn" onclick="analyzeResume()">
          Try Again
        </button>
      ` : ''}
    </div>
  `;
}

// Show analyzing state with progress
function showAnalyzingState() {
  const resultDiv = document.getElementById('result');

  resultDiv.innerHTML = `
    <div class="analyzing-state">
      <h3>Analyzing Resume</h3>
      <p>AI is comparing your resume with the job requirements...</p>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <small>This may take a few moments</small>
    </div>
  `;
}

// Enhanced loading state
function showLoading(message, details = '') {
  const resultDiv = document.getElementById('result');

  resultDiv.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div class="loading-content">
        <span class="loading-message">${escapeHtml(message)}</span>
        ${details ? `<small class="loading-details">${escapeHtml(details)}</small>` : ''}
      </div>
    </div>
  `;
}

// Show loading state
function showLoading(message) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <span>${message}</span>
    </div>
  `;
}

// Mock analysis function (fallback)
function performMockAnalysis(jobData, resumeContent) {
  // Simple keyword matching for demonstration
  const jobText = (jobData.title + ' ' + jobData.description).toLowerCase();
  const resumeText = resumeContent.toLowerCase();

  // Common skills to look for
  const commonSkills = [
    'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'html', 'css',
    'git', 'aws', 'docker', 'kubernetes', 'agile', 'scrum', 'typescript',
    'mongodb', 'postgresql', 'redis', 'linux', 'project management',
    'machine learning', 'data analysis', 'communication', 'leadership'
  ];

  const jobSkills = commonSkills.filter(skill => jobText.includes(skill));
  const resumeSkills = commonSkills.filter(skill => resumeText.includes(skill));

  const matchedSkills = jobSkills.filter(skill => resumeSkills.includes(skill));
  const missingSkills = jobSkills.filter(skill => !resumeSkills.includes(skill));

  const matchPercentage = jobSkills.length > 0 ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 0;

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
    totalJobSkills: jobSkills.length,
    source: 'offline'
  };
}

// Display analysis results from enhanced API
function displayAnalysisResults(apiResponse) {
  const resultsSection = document.getElementById('resultsSection');

  try {
    // Guard against unexpected/null responses
    if (!apiResponse || typeof apiResponse !== 'object') {
      console.error('Invalid API response:', apiResponse);
      showErrorState(
        'Invalid Response',
        'Unexpected response format from server.',
        'Please retry the analysis.'
      );
      return;
    }
    // Handle both old and new response formats
    const data = apiResponse.data || apiResponse;
    const analysis = data.analysis || data;

    // Render analysis source (AI vs non-AI)
    const aiEnabled = apiResponse.metadata?.aiEnabled;
    const analysisMethod = apiResponse.metadata?.analysisMethod || (data.matchScore && data.skills ? 'enhanced' : 'basic');
    renderAnalysisSourceBanner(Boolean(aiEnabled), analysisMethod);

    // Check for enhanced format
    if (data.matchScore && data.skills) {
      displayEnhancedResults(data);
    } else {
      // Fallback to basic format
      displayBasicResults(analysis);
    }

    // Show results section
    if (resultsSection) {
      resultsSection.style.display = 'block';
    }

    // Save to history
    saveToHistory(extractedJobData, apiResponse);

    // Clear loading state
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="success-message">
        [SUCCESS] Analysis complete! Results shown above.
      </div>
    `;

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    console.error('Error displaying results:', error);
    showError('Error displaying analysis results. Please try again.');
  }
}

// Render AI/non-AI banner in results section
function renderAnalysisSourceBanner(aiEnabled, analysisMethod) {
  const resultsSection = document.getElementById('resultsSection');
  if (!resultsSection) return;

  // Remove existing banner if present
  const existing = resultsSection.querySelector('.analysis-source');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.className = `analysis-source ${aiEnabled ? 'ai' : 'non-ai'}`;
  const label = aiEnabled ? '🤖 AI Enhanced' : '📖 Non‑AI Analysis';
  const method = analysisMethod ? ` • Method: ${escapeHtml(analysisMethod)}` : '';
  banner.innerHTML = `<span class="source-label">${label}${method}</span>`;

  // Insert at top of results section
  resultsSection.prepend(banner);
}

// Display enhanced analysis results with weighted scoring
function displayEnhancedResults(data) {
  const matchPercentage = document.getElementById('matchPercentage');
  const matchedSkills = document.getElementById('matchedSkills');
  const missingSkills = document.getElementById('missingSkills');

  // Update match percentage with enhanced scoring
  const overallScore = Math.round(data.matchScore.overall);
  matchPercentage.textContent = overallScore + '%';

  const scoreCircle = matchPercentage.parentElement;
  scoreCircle.className = `score-circle ${getScoreClass(overallScore)}`;

  // Add recommendation text
  const existingRecommendation = document.querySelector('.match-recommendation');
  if (existingRecommendation) {
    existingRecommendation.remove();
  }

  const recommendation = document.createElement('div');
  recommendation.className = 'match-recommendation';
  recommendation.innerHTML = `
    <p class="recommendation-text">${data.matchScore.recommendation}</p>
    <div class="score-breakdown">
      <span class="must-have-score">Must-have: ${Math.round(data.matchScore.mustHave)}%</span>
      <span class="nice-to-have-score">Nice-to-have: ${Math.round(data.matchScore.niceToHave)}%</span>
    </div>
  `;
  scoreCircle.parentNode.appendChild(recommendation);

  // Display enhanced matched skills with categories
  const allMatched = [
    ...data.skills.matched.mustHave,
    ...data.skills.matched.niceToHave
  ];

  if (allMatched.length > 0) {
    matchedSkills.innerHTML = `
      <div class="skills-section">
        <h4 class="skills-category critical">Required Skills Matched (${data.skills.matched.mustHave.length})</h4>
        <div class="skills-grid">
          ${data.skills.matched.mustHave.map(skill =>
      `<span class="skill-tag matched critical">${escapeHtml(skill.name)}</span>`
    ).join('')}
        </div>
        
        <h4 class="skills-category preferred">Preferred Skills Matched (${data.skills.matched.niceToHave.length})</h4>
        <div class="skills-grid">
          ${data.skills.matched.niceToHave.map(skill =>
      `<span class="skill-tag matched preferred">${escapeHtml(skill.name)}</span>`
    ).join('')}
        </div>
      </div>
    `;
  } else {
    matchedSkills.innerHTML = '<span class="no-skills">No matching skills found</span>';
  }

  // Display enhanced missing skills with priority
  const allMissing = [
    ...data.skills.missing.mustHave,
    ...data.skills.missing.niceToHave
  ];

  if (allMissing.length > 0) {
    missingSkills.innerHTML = `
      <div class="skills-section">
        ${data.skills.missing.mustHave.length > 0 ? `
          <h4 class="skills-category critical-gap">Critical Skill Gaps (${data.skills.missing.mustHave.length})</h4>
          <div class="skills-grid">
            ${data.skills.missing.mustHave.map(skill =>
      `<span class="skill-tag missing critical-gap">${escapeHtml(skill.name)}</span>`
    ).join('')}
          </div>
        ` : ''}
        
        ${data.skills.missing.niceToHave.length > 0 ? `
          <h4 class="skills-category minor-gap">Minor Skill Gaps (${data.skills.missing.niceToHave.length})</h4>
          <div class="skills-grid">
            ${data.skills.missing.niceToHave.map(skill =>
      `<span class="skill-tag missing minor-gap">${escapeHtml(skill.name)}</span>`
    ).join('')}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    missingSkills.innerHTML = '<span class="no-skills">No missing skills - excellent match!</span>';
  }

  // Add insights section
  addInsightsSection(data);

  // Add extra skills if available
  if (data.skills.extra && data.skills.extra.length > 0) {
    addExtraSkillsSection(data.skills.extra);
  }
}

// Display basic analysis results (fallback)
function displayBasicResults(analysis) {
  const matchPercentage = document.getElementById('matchPercentage');
  const matchedSkills = document.getElementById('matchedSkills');
  const missingSkills = document.getElementById('missingSkills');
  const resultsSection = document.getElementById('resultsSection');

  // Handle different response formats
  const percentage = analysis.ai?.overallScore || analysis.matchPercentage || analysis.match_percentage || 0;
  const matched = analysis.matchedSkills || analysis.matched_skills || [];
  const missing = analysis.missingSkills || analysis.missing_skills || [];

  // Update match percentage
  matchPercentage.textContent = percentage + '%';
  const scoreCircle = matchPercentage.parentElement;
  scoreCircle.className = `score-circle ${getScoreClass(percentage)}`;

  // Add recommendation if AI data is available
  if (analysis.ai) {
    const existingRecommendation = document.querySelector('.match-recommendation');
    if (existingRecommendation) existingRecommendation.remove();

    const recommendation = document.createElement('div');
    recommendation.className = 'match-recommendation';
    recommendation.innerHTML = `
      <p class="recommendation-text">${analysis.insights?.overallAssessment || 'AI-powered analysis complete'}</p>
      <div class="score-breakdown">
        <span class="must-have-score">Must-have: ${analysis.ai.mustHaveMatch?.percentage || 0}%</span>
        <span class="nice-to-have-score">Good-to-have: ${analysis.ai.goodToHaveMatch?.percentage || 0}%</span>
      </div>
    `;
    scoreCircle.parentNode.appendChild(recommendation);
  }

  // Display matched skills with AI proficiency if available
  if (analysis.ai?.mustHaveMatch || analysis.ai?.goodToHaveMatch) {
    const mustHaveMatched = analysis.ai.mustHaveMatch?.matched || [];
    const goodToHaveMatched = analysis.ai.goodToHaveMatch?.matched || [];

    matchedSkills.innerHTML = `
      <div class="skills-section">
        ${mustHaveMatched.length > 0 ? `
          <h4 class="skills-category critical">✅ Must-Have Skills (${mustHaveMatched.length})</h4>
          <div class="skills-grid">
            ${mustHaveMatched.map(skill => `
              <span class="skill-tag matched critical" title="Proficiency: ${skill.proficiency || 'N/A'}">
                ${escapeHtml(skill.skill)}
                ${skill.proficiency ? `<small class="proficiency">${skill.proficiency}</small>` : ''}
              </span>
            `).join('')}
          </div>
        ` : ''}
        
        ${goodToHaveMatched.length > 0 ? `
          <h4 class="skills-category preferred">✅ Good-to-Have Skills (${goodToHaveMatched.length})</h4>
          <div class="skills-grid">
            ${goodToHaveMatched.map(skill => `
              <span class="skill-tag matched preferred" title="Proficiency: ${skill.proficiency || 'N/A'}">
                ${escapeHtml(skill.skill)}
                ${skill.proficiency ? `<small class="proficiency">${skill.proficiency}</small>` : ''}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  } else if (matched.length > 0) {
    matchedSkills.innerHTML = matched
      .map(skill => `<span class="skill-tag matched">${escapeHtml(skill)}</span>`)
      .join('');
  } else {
    matchedSkills.innerHTML = '<span class="no-skills">No matching skills found</span>';
  }

  // Display missing skills with AI gaps if available (clickable to add to portfolio)
  if (analysis.ai?.skillsGaps || analysis.ai?.mustHaveMatch?.missing) {
    const criticalGaps = analysis.ai.skillsGaps?.critical || analysis.ai.mustHaveMatch?.missing?.map(s => s.skill) || [];
    const minorGaps = analysis.ai.skillsGaps?.minor || analysis.ai.goodToHaveMatch?.missing?.map(s => s.skill) || [];

    missingSkills.innerHTML = `
      <div class="skills-section">
        <p class="add-skill-hint">💡 Click on a missing skill to add it to your portfolio</p>
        ${criticalGaps.length > 0 ? `
          <h4 class="skills-category critical-gap">⚠️ Critical Skill Gaps (${criticalGaps.length})</h4>
          <div class="skills-grid">
            ${criticalGaps.map(skill => {
      const skillName = typeof skill === 'string' ? skill : skill.skill;
      return `<span class="skill-tag missing critical-gap add-skill" data-skill="${escapeHtml(skillName)}" title="Click to add to portfolio">➕ ${escapeHtml(skillName)}</span>`;
    }).join('')}
          </div>
        ` : ''}
        
        ${minorGaps.length > 0 ? `
          <h4 class="skills-category minor-gap">📝 Minor Skill Gaps (${minorGaps.length})</h4>
          <div class="skills-grid">
            ${minorGaps.map(skill => {
      const skillName = typeof skill === 'string' ? skill : skill.skill;
      return `<span class="skill-tag missing minor-gap add-skill" data-skill="${escapeHtml(skillName)}" title="Click to add to portfolio">➕ ${escapeHtml(skillName)}</span>`;
    }).join('')}
          </div>
        ` : ''}
      </div>
    `;

    // Add click handlers for adding skills
    attachAddSkillHandlers(missingSkills);
  } else if (missing.length > 0) {
    missingSkills.innerHTML = `
      <p class="add-skill-hint">💡 Click on a missing skill to add it to your portfolio</p>
      ${missing.map(skill => `<span class="skill-tag missing add-skill" data-skill="${escapeHtml(skill)}" title="Click to add to portfolio">➕ ${escapeHtml(skill)}</span>`).join('')}
    `;
    attachAddSkillHandlers(missingSkills);
  } else {
    missingSkills.innerHTML = '<span class="no-skills">No missing skills - great match!</span>';
  }


  // Add AI Insights section if available
  if (analysis.ai || analysis.analysis || analysis.insights) {
    addAIInsightsSection(analysis, resultsSection);
  }
}

// Add comprehensive AI insights section
function addAIInsightsSection(analysis, resultsSection) {
  // Remove existing insights
  const existingInsights = resultsSection.querySelector('.ai-insights-section');
  if (existingInsights) existingInsights.remove();

  const ai = analysis.ai;
  const analysisData = analysis.analysis;
  const insights = analysis.insights;

  const insightsDiv = document.createElement('div');
  insightsDiv.className = 'ai-insights-section section';

  let insightsHTML = '<h3>🤖 AI Insights</h3>';

  // Experience Alignment
  if (ai?.experienceAlignment) {
    const exp = ai.experienceAlignment;
    const resumeYrs = exp.resumeYears !== undefined ? exp.resumeYears : 'N/A';
    const jobYrs = exp.jobRequiredYears !== undefined ? exp.jobRequiredYears : 'N/A';
    insightsHTML += `
      <div class="insight-card experience">
        <h4>📊 Experience Alignment</h4>
        <div class="insight-content">
          <span class="badge ${exp.assessment}">${exp.assessment?.toUpperCase() || 'N/A'}</span>
          <p>Your Experience: <strong>${resumeYrs} years</strong> | Job Requires: <strong>${jobYrs}+ years</strong></p>
          <p>Level Match: ${exp.levelMatch ? '✅ Yes' : '❌ No'} | Years Match: ${exp.yearsMatch ? '✅ Yes' : '❌ No'}</p>
        </div>
      </div>
    `;
  }


  // Strengths
  if (analysisData?.strengths && analysisData.strengths.length > 0) {
    insightsHTML += `
      <div class="insight-card strengths">
        <h4>💪 Your Strengths</h4>
        <ul>
          ${analysisData.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Recommendations
  if (analysisData?.recommendations && analysisData.recommendations.length > 0) {
    insightsHTML += `
      <div class="insight-card recommendations">
        <h4>💡 Recommendations</h4>
        <ul>
          ${analysisData.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Skills Breakdown
  if (analysisData?.skillsBreakdown?.resume?.categoryBreakdown) {
    const categories = analysisData.skillsBreakdown.resume.categoryBreakdown;
    insightsHTML += `
      <div class="insight-card skills-breakdown">
        <h4>📈 Your Skills Breakdown</h4>
        <div class="category-grid">
          ${Object.entries(categories).map(([cat, count]) => `
            <span class="category-badge">${cat}: ${count}</span>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Extra Skills (Bonus)
  if (analysisData?.skillsBreakdown?.comparison?.extraSkills) {
    const extras = analysisData.skillsBreakdown.comparison.extraSkills;
    if (extras.length > 0) {
      insightsHTML += `
        <div class="insight-card extra-skills">
          <h4>🌟 Bonus Skills You Have</h4>
          <div class="skills-grid">
            ${extras.slice(0, 15).map(skill => `<span class="skill-tag extra">${escapeHtml(skill)}</span>`).join('')}
            ${extras.length > 15 ? `<span class="skill-tag extra more">+${extras.length - 15} more</span>` : ''}
          </div>
        </div>
      `;
    }
  }

  insightsDiv.innerHTML = insightsHTML;
  resultsSection.appendChild(insightsDiv);
}

// Attach click handlers to add-skill elements
function attachAddSkillHandlers(container) {
  const skillElements = container.querySelectorAll('.add-skill');
  skillElements.forEach(el => {
    el.addEventListener('click', async (e) => {
      const skill = e.target.getAttribute('data-skill');
      if (skill) {
        await addSkillToPortfolio(skill, e.target);
      }
    });
  });
}

// Add a skill to portfolio.txt via API
async function addSkillToPortfolio(skill, element) {
  try {
    // Show loading state
    const originalContent = element.innerHTML;
    element.innerHTML = '⏳ Adding...';
    element.style.pointerEvents = 'none';

    // Get the current job URL to clear cache
    const jobUrl = extractedJobData?.url || '';

    const response = await fetch(API_BASE_URL + API_ENDPOINTS.addSkill, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ skill, jobUrl })
    });

    const result = await response.json();

    if (result.success) {
      if (result.data.alreadyExists) {
        // Skill already exists
        element.innerHTML = '✓ Already in portfolio';
        element.classList.remove('missing', 'critical-gap', 'minor-gap');
        element.classList.add('added-existing');
      } else {
        // Successfully added
        element.innerHTML = '✅ Added!';
        element.classList.remove('missing', 'critical-gap', 'minor-gap');
        element.classList.add('added-success');
      }

      // Remove the add-skill class so it can't be clicked again
      element.classList.remove('add-skill');

      // Show success toast
      showToast(`"${skill}" ${result.data.alreadyExists ? 'is already in' : 'added to'} your portfolio!`, 'success');
    } else {
      throw new Error(result.error || 'Failed to add skill');
    }

  } catch (error) {
    console.error('Error adding skill:', error);
    element.innerHTML = '❌ Error';
    element.style.pointerEvents = 'auto';
    showToast(`Failed to add skill: ${error.message}`, 'error');
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = message;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add insights section to results
function addInsightsSection(data) {
  if (!data.insights) return;

  const resultsSection = document.getElementById('resultsSection');

  // Remove existing insights
  const existingInsights = resultsSection.querySelector('.insights-section');
  if (existingInsights) {
    existingInsights.remove();
  }

  const insightsDiv = document.createElement('div');
  insightsDiv.className = 'insights-section';

  const insightsHTML = `
    <div class="section-header">
      <h3>AI Insights</h3>
    </div>
    
    ${data.insights.strengths && data.insights.strengths.length > 0 ? `
      <div class="insights-category strengths">
        <h4>Your Strengths</h4>
        <ul>
          ${data.insights.strengths.map(strength =>
    `<li>${escapeHtml(strength)}</li>`
  ).join('')}
        </ul>
      </div>
    ` : ''}
    
    ${data.insights.improvements && data.insights.improvements.length > 0 ? `
      <div class="insights-category improvements">
        <h4>Areas for Improvement</h4>
        <ul>
          ${data.insights.improvements.map(improvement =>
    `<li>${escapeHtml(improvement)}</li>`
  ).join('')}
        </ul>
      </div>
    ` : ''}
    
    ${data.insights.careerAdvice && data.insights.careerAdvice.length > 0 ? `
      <div class="insights-category career-advice">
        <h4>Career Advice</h4>
        <ul>
          ${data.insights.careerAdvice.map(advice =>
    `<li>${escapeHtml(advice)}</li>`
  ).join('')}
        </ul>
      </div>
    ` : ''}
  `;

  insightsDiv.innerHTML = insightsHTML;
  resultsSection.appendChild(insightsDiv);
}

// Add extra skills section
function addExtraSkillsSection(extraSkills) {
  const resultsSection = document.getElementById('resultsSection');

  // Remove existing extra skills
  const existingExtra = resultsSection.querySelector('.extra-skills-section');
  if (existingExtra) {
    existingExtra.remove();
  }

  const extraDiv = document.createElement('div');
  extraDiv.className = 'extra-skills-section';

  extraDiv.innerHTML = `
    <div class="section-header">
      <h3>Bonus Skills You Have</h3>
      <p class="section-description">Skills you have that aren't required but add value</p>
    </div>
    <div class="skills-grid">
      ${extraSkills.slice(0, 10).map(skill =>
    `<span class="skill-tag extra">${escapeHtml(skill.name)}</span>`
  ).join('')}
      ${extraSkills.length > 10 ? `
        <span class="skill-tag extra more">+${extraSkills.length - 10} more</span>
      ` : ''}
    </div>
  `;

  resultsSection.appendChild(extraDiv);
}

// Get CSS class based on score
function getScoreClass(percentage) {
  if (percentage >= 80) return 'excellent';
  if (percentage >= 60) return 'good';
  if (percentage >= 40) return 'fair';
  return 'poor';
}

// Display extracted job data
function displayJobData(data) {
  const resultDiv = document.getElementById('result');

  // Create description preview (first 300 chars + Key Skills if present)
  let descPreview = data.description || '';
  let keySkillsSection = '';

  // Extract Key Skills section if present
  const keySkillsMatch = descPreview.match(/Key Skills:(.+)$/s);
  if (keySkillsMatch) {
    keySkillsSection = '<div class="key-skills-preview"><strong>Key Skills:</strong> ' + escapeHtml(keySkillsMatch[1].trim()) + '</div>';
    descPreview = descPreview.replace(/\n\nKey Skills:.+$/s, '');
  }

  // Truncate main description
  const truncatedDesc = descPreview.length > 300 ? descPreview.substring(0, 300) + '...' : descPreview;

  resultDiv.innerHTML = `
    <div class="job-data">
      <h3>[SUCCESS] Job Data Extracted</h3>
      <p class="job-title">${escapeHtml(data.title)}</p>
      <div class="description-preview" style="font-size: 12px; color: #666; margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; max-height: 150px; overflow-y: auto;">
        ${escapeHtml(truncatedDesc)}
      </div>
      ${keySkillsSection ? `<div style="font-size: 12px; color: #0073b1; margin: 5px 0; padding: 5px; background: #e8f4fd; border-radius: 5px;">${keySkillsSection}</div>` : ''}
      <div class="metadata">
        <small>Source: ${data.source || 'unknown'} • Ready for analysis • ${new Date(data.timestamp).toLocaleString()}</small>
      </div>
    </div>
  `;
}

// Show error message
function showError(message) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners - now handled in DOMContentLoaded above
// Keeping this section for any additional future listeners

// Clear extracted data function
function clearExtractedData() {
  // Ask for confirmation
  if (!confirm('Are you sure you want to clear the extracted job data and uploaded resume?')) {
    return;
  }

  extractedJobData = null;
  uploadedResume = null;

  // Clear storage for current URL only
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const currentUrl = tabs[0].url;
    const result = await chrome.storage.local.get(['analysisData']);
    const analysisData = result.analysisData || {};

    // Remove data for current URL
    delete analysisData[currentUrl];
    await chrome.storage.local.set({ analysisData });
  });

  // Reset UI
  const resultEl = document.getElementById('result');
  const resumeFileEl = document.getElementById('resumeFile');
  const fileStatusEl = document.getElementById('fileStatus');
  const resultsSectionEl = document.getElementById('resultsSection');
  const clearDataEl = document.getElementById('clearData');

  if (resultEl) resultEl.innerHTML = '';
  if (resumeFileEl) resumeFileEl.value = '';
  if (fileStatusEl) fileStatusEl.innerHTML = '';
  if (resultsSectionEl) resultsSectionEl.style.display = 'none';

  // Hide clear button
  if (clearDataEl) clearDataEl.style.display = 'none';

  updateAnalyzeButton();

  showSuccessMessage('All data cleared successfully! Ready for new analysis.');
}

// Show clear button
function showClearButton() {
  const clearDataEl = document.getElementById('clearData');
  if (clearDataEl) {
    clearDataEl.style.display = 'inline-block';
  }
}

// Switch between tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    if (content) {
      content.style.display = 'none';
    }
  });
  const tabContentEl = document.getElementById(`${tabName}-tab`);
  if (tabContentEl) {
    tabContentEl.style.display = 'block';
  }

  // Load history if switching to history tab
  if (tabName === 'history') {
    loadHistory();
  }
}

// Save analysis to history
async function saveToHistory(jobData, analysisResults) {
  try {
    const result = await chrome.storage.local.get(['analysisHistory']);
    const history = result.analysisHistory || [];

    const historyItem = {
      id: Date.now(),
      jobTitle: jobData.title,
      company: extractCompanyName(jobData),
      url: jobData.url,
      timestamp: new Date().toISOString(),
      matchScore: analysisResults.data?.matchScore?.overall || 0,
      analysisData: analysisResults
    };

    // Add to beginning of array (newest first)
    history.unshift(historyItem);

    // Keep only last 50 items
    if (history.length > 50) {
      history.splice(50);
    }

    await chrome.storage.local.set({ analysisHistory: history });

    // Refresh history display if on history tab
    if (document.querySelector('[data-tab="history"]').classList.contains('active')) {
      loadHistory();
    }
  } catch (error) {
    console.error('Error saving to history:', error);
  }
}

// Load and display history
async function loadHistory() {
  try {
    const result = await chrome.storage.local.get(['analysisHistory']);
    const history = result.analysisHistory || [];

    const historyList = document.getElementById('historyList');

    if (history.length === 0) {
      historyList.innerHTML = '<div class="no-history">No analysis history yet. Analyze some jobs to see them here!</div>';
      return;
    }

    historyList.innerHTML = history.map(item => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const scoreClass = getScoreClass(item.matchScore);

      return `
        <div class="history-item" data-url="${item.url}">
          <div class="history-item-title">${escapeHtml(item.jobTitle)}</div>
          <div class="history-item-company">${escapeHtml(item.company)}</div>
          <div class="history-item-meta">
            <span>${date} at ${time}</span>
            <span class="history-item-score ${scoreClass}">${item.matchScore}%</span>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers for navigation
    historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        navigateToJob(url);
      });
    });

  } catch (error) {
    console.error('Error loading history:', error);
  }
}

// Navigate to job URL
async function navigateToJob(url) {
  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.update(currentTab.id, { url: url });

    // Switch back to analyzer tab
    switchTab('analyzer');

    showSuccessMessage('Navigating to job page...');
  } catch (error) {
    console.error('Error navigating to job:', error);
    showError('Failed to navigate to job page');
  }
}

// Extract company name from job data
function extractCompanyName(jobData) {
  // Try to extract company from description or URL
  if (jobData.description) {
    const companyMatch = jobData.description.match(/Company[:\s]*([^\n\.]+)/i);
    if (companyMatch) {
      return companyMatch[1].trim();
    }
  }

  // Extract from URL if available
  if (jobData.url) {
    const urlMatch = jobData.url.match(/\/company\/([^\/\?]+)/i);
    if (urlMatch) {
      return urlMatch[1].replace(/-/g, ' ');
    }
  }

  return 'Unknown Company';
}

// Clear all history
async function clearAllHistory() {
  if (confirm('Are you sure you want to clear all analysis history?')) {
    await chrome.storage.local.remove(['analysisHistory']);
    loadHistory();
    showSuccessMessage('History cleared successfully!');
  }
}

// Show success message
function showSuccessMessage(message) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <div class="success-message">
      [SUCCESS] ${escapeHtml(message)}
    </div>
  `;

  // Clear after 3 seconds
  setTimeout(() => {
    if (resultDiv.innerHTML.includes(message)) {
      resultDiv.innerHTML = '';
    }
  }, 3000);
}

// Clear all session data - global function accessible from HTML
function clearAllSessionData() {
  if (!confirm('Are you sure you want to clear ALL data including job information, uploaded resume, and analysis results?')) {
    return;
  }

  extractedJobData = null;
  uploadedResume = null;

  // Clear storage for current URL only (not all URLs)
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const currentUrl = tabs[0].url;
    const result = await chrome.storage.local.get(['analysisData']);
    const analysisData = result.analysisData || {};

    // Remove data for current URL
    delete analysisData[currentUrl];
    await chrome.storage.local.set({ analysisData });
  });

  // Reset all UI elements
  const resultEl = document.getElementById('result');
  const resumeFileEl = document.getElementById('resumeFile');
  const fileStatusEl = document.getElementById('fileStatus');
  const resultsSectionEl = document.getElementById('resultsSection');
  const clearDataEl = document.getElementById('clearData');

  if (resultEl) resultEl.innerHTML = '';
  if (resumeFileEl) resumeFileEl.value = '';
  if (fileStatusEl) fileStatusEl.innerHTML = '';
  if (resultsSectionEl) resultsSectionEl.style.display = 'none';
  if (clearDataEl) clearDataEl.style.display = 'none';

  updateAnalyzeButton();

  showSuccessMessage('All session data cleared! Ready for fresh analysis.');
}

// Test if content script is connected
async function testConnection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url.includes('linkedin.com')) {
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script not connected:', chrome.runtime.lastError.message);
        } else {
          console.log('Content script connection test successful');
        }
      });
    }
  } catch (error) {
    console.error('Connection test failed:', error);
  }
}
