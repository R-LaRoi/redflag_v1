// RedFlag Background Script
// Handles message passing and data coordination between content script and popup

console.log("RedFlag: Background script loaded");

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("RedFlag: Background received message:", message);

  switch (message.type) {
    case "ANALYSIS_RESULT":
      handleAnalysisResult(message.data, sender);
      break;

    case "USER_REPORT":
      handleUserReport(message.data, sender);
      break;

    case "GET_SETTINGS":
      getSettings(sendResponse);
      return true; // Will respond asynchronously

    case "SAVE_SETTINGS":
      saveSettings(message.data, sendResponse);
      return true; // Will respond asynchronously

    case "GET_REPORTS":
      getStoredReports(sendResponse);
      return true; // Will respond asynchronously

    default:
      console.warn("RedFlag: Unknown message type:", message.type);
  }
});

// Handle analysis results from content script
function handleAnalysisResult(data, sender) {
  console.log("RedFlag: Analysis result received:", data);

  // Store analysis result for potential reporting
  const analysisData = {
    tabId: sender.tab.id,
    url: data.url,
    jobTitle: data.jobTitle,
    company: data.company,
    analysisResult: data.analysisResult,
    timestamp: Date.now(),
  };

  // Store in local storage
  chrome.storage.local.get(["recentAnalyses"], (result) => {
    const analyses = result.recentAnalyses || [];
    analyses.unshift(analysisData);

    // Keep only last 50 analyses to prevent storage bloat
    if (analyses.length > 50) {
      analyses.splice(50);
    }

    chrome.storage.local.set({ recentAnalyses: analyses });
  });
}

// Handle user reports from popup
function handleUserReport(data, sender) {
  console.log("RedFlag: User report received:", data);

  const reportData = {
    id: generateReportId(),
    url: data.url,
    jobTitle: data.jobTitle,
    company: data.company,
    reportType: data.reportType,
    userComment: data.userComment,
    timestamp: Date.now(),
    synced: false, // Flag for future backend sync
  };

  // Store report locally
  chrome.storage.local.get(["userReports"], (result) => {
    const reports = result.userReports || [];
    reports.unshift(reportData);

    chrome.storage.local.set({ userReports: reports }, () => {
      console.log("RedFlag: Report saved locally");
      // TODO: In future phases, sync with backend API
    });
  });
}

// Get user settings from storage
function getSettings(sendResponse) {
  chrome.storage.local.get(
    ["extensionEnabled", "showWarnings", "analysisMode"],
    (result) => {
      const settings = {
        extensionEnabled: result.extensionEnabled !== false, // Default to true
        showWarnings: result.showWarnings !== false, // Default to true
        analysisMode: result.analysisMode || "conservative", // Default to conservative
      };

      sendResponse({ success: true, settings });
    }
  );
}

// Save user settings to storage
function saveSettings(settings, sendResponse) {
  chrome.storage.local.set(settings, () => {
    if (chrome.runtime.lastError) {
      console.error(
        "RedFlag: Error saving settings:",
        chrome.runtime.lastError
      );
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      console.log("RedFlag: Settings saved:", settings);
      sendResponse({ success: true });
    }
  });
}

// Get stored reports for popup display
function getStoredReports(sendResponse) {
  chrome.storage.local.get(["userReports"], (result) => {
    const reports = result.userReports || [];
    sendResponse({ success: true, reports: reports.slice(0, 10) }); // Return last 10 reports
  });
}

// Generate unique report ID
function generateReportId() {
  return "report_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log("RedFlag: Extension installed/updated:", details);

  if (details.reason === "install") {
    // Set default settings on first install
    chrome.storage.local.set({
      extensionEnabled: true,
      showWarnings: true,
      analysisMode: "conservative",
    });
  }
});

// Handle storage changes (for debugging)
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log("RedFlag: Storage changed:", changes, "in", namespace);
});
