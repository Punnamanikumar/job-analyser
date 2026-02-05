// Check if we're on a LinkedIn job page
function isLinkedInJobPage() {
  return window.location.hostname.includes('linkedin.com') && (
    window.location.href.includes('/jobs/view/') ||
    window.location.pathname.includes('/jobs/view/') ||
    window.location.href.includes('/jobs/collections/') ||
    window.location.href.includes('currentJobId=') ||
    document.querySelector('.jobs-unified-top-card') !== null ||
    document.querySelector('[data-job-id]') !== null ||
    document.querySelector('.jobs-search__job-details') !== null
  );
}

// Check if we're on a Naukri job page
function isNaukriJobPage() {
  return window.location.hostname.includes('naukri.com') && (
    window.location.pathname.includes('/job-listings-') ||
    document.querySelector('[class^="styles_jd-header-title"]') !== null ||
    document.querySelector('[class^="styles_job-desc-container"]') !== null
  );
}

// Check if we're on any supported job page
function isJobPage() {
  return isLinkedInJobPage() || isNaukriJobPage();
}

// Get current site name
function getCurrentSite() {
  if (window.location.hostname.includes('linkedin.com')) return 'linkedin';
  if (window.location.hostname.includes('naukri.com')) return 'naukri';
  return 'unknown';
}

// Extract LinkedIn job title with multiple selector fallbacks
function extractLinkedInJobTitle() {
  const selectors = [
    '.jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title a',
    '.jobs-unified-top-card h1',
    '.job-details-jobs-unified-top-card__job-title h1',
    '.job-details-jobs-unified-top-card__job-title a',
    'h1[data-test-id="job-title"]',
    '.jobs-details__main-content h1',
    '.job-view-layout h1',
    '.jobs-search__job-details h1',
    '.jobs-search__job-details .jobs-unified-top-card__job-title',
    '.jobs-details h1',
    '.jobs-details .jobs-unified-top-card__job-title h1',
    '.job-details-modal h1',
    '.job-details h2',
    'h1.jobs-unified-top-card__job-title',
    'h2.jobs-unified-top-card__job-title'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      return element.textContent.trim();
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
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      const title = element.textContent.trim();
      // Avoid returning generic titles or navigation elements
      if (title.length > 3 && !title.toLowerCase().includes('naukri') && !title.toLowerCase().includes('jobs')) {
        return title;
      }
    }
  }

  return 'Job title not found';
}

// Extract job title based on current site
function extractJobTitle() {
  const site = getCurrentSite();
  if (site === 'linkedin') return extractLinkedInJobTitle();
  if (site === 'naukri') return extractNaukriJobTitle();
  return 'Job title not found';
}

// Extract LinkedIn job description with multiple selector fallbacks
function extractLinkedInJobDescription() {
  const selectors = [
    '.jobs-description-content__text',
    '.jobs-description__content',
    '.job-view-layout .jobs-description',
    '.jobs-box__html-content',
    '.jobs-description',
    '[data-test-id="job-description"]',
    '.job-details-jobs-unified-top-card__job-description',
    '.jobs-details__main-content .jobs-description',
    '.jobs-search__job-details .jobs-description',
    '.jobs-search__job-details .jobs-description-content__text',
    '.jobs-details .jobs-description-content__text',
    '.job-details-modal .jobs-description',
    '.jobs-description-content',
    '.artdeco-card .jobs-description',
    '.jobs-details .jobs-description'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Get text content and clean it up
      let text = element.innerText || element.textContent || '';
      text = text.trim();
      if (text.length > 50) { // Ensure we have substantial content
        return text;
      }
    }
  }

  return 'Job description not found';
}

// Extract Naukri job description (including key skills and experience)
function extractNaukriJobDescription() {
  let fullDescription = '';

  // 1. Extract experience requirement from job header (e.g., "5 - 10 years")
  let experienceText = '';
  try {
    // First, try the job_header element which contains the official experience requirement
    const jobHeader = document.getElementById('job_header');
    if (jobHeader) {
      const headerText = jobHeader.innerText || jobHeader.textContent || '';
      const expMatch = headerText.match(/(\d+)\s*[-–]\s*(\d+)\s*(years?|yrs?)/i);
      if (expMatch) {
        experienceText = `${expMatch[1]} - ${expMatch[2]} years`;
        console.log('Found experience in job_header:', experienceText);
      }
    }

    // Fallback to other selectors if job_header didn't work
    if (!experienceText) {
      const expSelectors = [
        '#job_header span',
        '[class*="exp"] .styles_jhc__exp',
        '[class*="styles_jhc__exp"]',
        '.exp .styles_jhc__exp',
        '.other-details span:first-child',
        '[class*="other-details"] span',
        '.nI-gNb-sb__main-container ul li:first-child'
      ];

      for (const selector of expSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = (element.innerText || element.textContent || '').trim();
          // Check if it looks like experience (contains "year" or "yrs" or pattern like "5 - 10")
          if (text.match(/\d+\s*[-–to]\s*\d+\s*(years?|yrs?)/i) || text.match(/\d+\s*(years?|yrs?)/i)) {
            experienceText = text;
            break;
          }
        }
      }
    }

    // Fallback: try to find experience from URL or body text
    if (!experienceText) {
      const urlMatch = window.location.href.match(/(\d+)-to-(\d+)-years?/i);
      if (urlMatch) {
        experienceText = `${urlMatch[1]} - ${urlMatch[2]} years`;
      }
    }

    // Alternative: scan all text elements near the title for experience pattern
    if (!experienceText) {
      const allSpans = document.querySelectorAll('span');
      for (const span of allSpans) {
        const text = span.innerText?.trim() || '';
        if (text.match(/^\d+\s*[-–to]\s*\d+\s*(years?|yrs?)$/i)) {
          experienceText = text;
          break;
        }
      }
    }
  } catch (e) {
    console.error('Experience extraction error:', e);
  }

  // 2. Get main job description
  const descSelectors = [
    '[class^="styles_job-desc-container"]',
    '[class*="job-desc-container"]',
    '.job-desc',
    '[class^="styles_JDC"]',
    '.jd-container',
    'section[class*="job-desc"]'
  ];

  for (const selector of descSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = (element.innerText || element.textContent || '').trim();
      if (text.length > 50) {
        fullDescription = text;
        break;
      }
    }
  }

  // 3. Extract Key Skills from chips inside the key-skill container
  let keySkillsText = '';
  try {
    // Find the key-skill container
    const keySkillContainer = document.querySelector('[class*="key-skill"]');
    if (keySkillContainer) {
      // Get all chip elements inside the container
      const chips = keySkillContainer.querySelectorAll('[class*="chip"]');
      if (chips.length > 0) {
        const skills = Array.from(chips)
          .map(chip => chip.innerText.trim())
          .filter(s => s.length > 0 && s.length < 50);
        if (skills.length > 0) {
          keySkillsText = '\n\nKey Skills: ' + [...new Set(skills)].join(', ');
        }
      }
    }

    // Fallback: find all chips on page if container not found
    if (!keySkillsText) {
      const allChips = document.querySelectorAll('[class*="chip"]');
      if (allChips.length > 0) {
        const skills = Array.from(allChips)
          .map(chip => chip.innerText.trim())
          .filter(s => s.length > 0 && s.length < 50 && !s.includes('\n'));
        if (skills.length > 0) {
          keySkillsText = '\n\nKey Skills: ' + [...new Set(skills)].join(', ');
        }
      }
    }
  } catch (e) {
    console.error('Key skills extraction error:', e);
  }

  // 4. Combine experience, description, and key skills
  // Put experience at the BEGINNING so AI sees it clearly
  let result = '';
  if (experienceText) {
    result = `EXPERIENCE REQUIRED: ${experienceText}\n\n`;
    console.log('Extracted experience:', experienceText);
  }
  result += fullDescription + keySkillsText;

  return result.length > 50 ? result : 'Job description not found';
}

// Extract job description based on current site
function extractJobDescription() {
  const site = getCurrentSite();
  if (site === 'linkedin') return extractLinkedInJobDescription();
  if (site === 'naukri') return extractNaukriJobDescription();
  return 'Job description not found';
}

// Extract job data with retry mechanism
function extractJobData() {
  console.log('Extracting job data from:', window.location.href);
  console.log('Current site:', getCurrentSite());
  console.log('Is job page check:', isJobPage());

  if (!isJobPage()) {
    console.log('Not detected as job page');
    return null;
  }

  const jobTitle = extractJobTitle();
  const jobDescription = extractJobDescription();

  console.log('Extracted title:', jobTitle);
  console.log('Extracted description length:', jobDescription.length);

  // Validate that we got meaningful data
  if (jobTitle === 'Job title not found' && jobDescription === 'Job description not found') {
    console.log('No valid job data found');
    return null;
  }

  return {
    title: jobTitle,
    description: jobDescription,
    url: window.location.href,
    source: getCurrentSite(),
    timestamp: new Date().toISOString()
  };
}

// Handle dynamic content loading
let lastUrl = window.location.href;
let observer;

function setupObserver() {
  // Disconnect existing observer
  if (observer) {
    observer.disconnect();
  }

  // Watch for DOM changes
  observer = new MutationObserver((mutations) => {
    const currentUrl = window.location.href;

    // Check if URL changed (SPA navigation)
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('Page changed:', currentUrl, '| Site:', getCurrentSite());
    }

    // Check if job content loaded (LinkedIn or Naukri)
    const hasLinkedInContent = document.querySelector('.jobs-description-content__text') ||
      document.querySelector('.jobs-description__content') ||
      document.querySelector('.jobs-unified-top-card__job-title');

    const hasNaukriContent = document.querySelector('[class^="styles_jd-header-title"]') ||
      document.querySelector('[class^="styles_job-desc-container"]');

    if ((hasLinkedInContent || hasNaukriContent) && isJobPage()) {
      console.log('Job content detected on', getCurrentSite());
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Message listener for popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.action === 'ping') {
    console.log('Ping received from popup');
    sendResponse({ success: true, message: 'Content script is connected' });
    return false;
  }

  if (request.action === 'extractJobData') {
    console.log('Received extract job data request');

    // First attempt
    let jobData = extractJobData();

    if (!jobData) {
      console.log('First attempt failed, waiting for content to load...');
      // Wait a bit for dynamic content to load
      setTimeout(() => {
        jobData = extractJobData();
        if (jobData) {
          console.log('Second attempt successful');
          sendResponse({ success: true, data: jobData });
        } else {
          console.log('Both attempts failed');
          sendResponse({
            success: false,
            error: 'Not on a job page or data not found. Please make sure you are on a LinkedIn job posting page.',
            debug: {
              url: window.location.href,
              isJobPage: isJobPage(),
              foundElements: {
                topCard: !!document.querySelector('.jobs-unified-top-card'),
                jobDetails: !!document.querySelector('.jobs-search__job-details'),
                description: !!document.querySelector('.jobs-description')
              }
            }
          });
        }
      }, 2000);
      return true; // Keep message channel open for async response
    } else {
      console.log('First attempt successful');
      sendResponse({ success: true, data: jobData });
    }
    return true; // Keep message channel open
  }

  if (request.greeting) {
    alert('Content script received: ' + request.greeting);
  }

  return false; // Don't keep message channel open for other messages
});

// Test connection
chrome.runtime.onConnect.addListener((port) => {
  console.log('Content script connected');
});

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupObserver);
} else {
  setupObserver();
}

// Signal that the content script is ready
setTimeout(() => {
  console.log('Content script fully initialized');
  // Send a ready signal to any listeners
  try {
    chrome.runtime.sendMessage({ action: 'contentScriptReady', url: window.location.href });
  } catch (e) {
    // Ignore errors if popup isn't listening
  }
}, 1000);

