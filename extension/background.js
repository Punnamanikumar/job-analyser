// Background script for LinkedIn Analyser

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  // Open the side panel for the current window
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Optional: Auto-open side panel when on LinkedIn
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('linkedin.com/jobs')) {
    // Auto-open side panel when visiting LinkedIn jobs
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      // Side panel might already be open
      console.log('Side panel already open or error:', error);
    }
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'contentScriptReady') {
    console.log('Content script ready on:', request.url);
  }
  
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('LinkedIn Analyser extension installed.');
});
