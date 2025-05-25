// RedFlag Background Script
// Manages message routing, storage, and extension state

console.log("RedFlag: Background script loaded");

// Main message handler for content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("RedFlag: Background received message:", message);

  switch (message.type) {
    case "ANALYSIS_RESULT":
      storeAnalysisResult(message.data, sender);
      break;
    case "USER_REPORT":
      storeUserReport(message.data);
      break;
    case "GET_SETTINGS":
      fetchSettings(sendResponse);
      return true; // Async response
    case "SAVE_SETTINGS":
      persistSettings(message.data, sendResponse);
      return true; // Async response
    case "GET_REPORTS":
      fetchReports(sendResponse);
      return true; // Async response
    default:
      console.warn("RedFlag: Unknown message type:", message.type);
  }
});

// Store analysis results from content script
function storeAnalysisResult(data, sender) {
  console.log("RedFlag: Analysis result received:", data);

  const analysis = {
    tabId: sender.tab?.id,
    url: data.url,
    jobTitle: data.jobTitle,
    company: data.company,
    analysisResult: data.analysisResult,
    timestamp: Date.now(),
  };

  chrome.storage.local.get(["recentAnalyses"], (result) => {
    const analyses = result.recentAnalyses || [];
    analyses.unshift(analysis);
    if (analyses.length > 50) analyses.length = 50;
    chrome.storage.local.set({ recentAnalyses: analyses });
  });
}

// Store user reports from popup
function storeUserReport(data) {
  console.log("RedFlag: User report received:", data);

  const report = {
    id: generateReportId(),
    url: data.url,
    jobTitle: data.jobTitle,
    company: data.company,
    reportType: data.reportType,
    userComment: data.userComment,
    timestamp: Date.now(),
    synced: false,
  };

  chrome.storage.local.get(["userReports"], (result) => {
    const reports = result.userReports || [];
    reports.unshift(report);
    chrome.storage.local.set({ userReports: reports }, () => {
      console.log("RedFlag: Report saved locally");
    });
  });
}

// Retrieve extension settings
function fetchSettings(sendResponse) {
  chrome.storage.local.get(
    ["extensionEnabled", "showWarnings", "analysisMode"],
    (result) => {
      sendResponse({
        success: true,
        settings: {
          extensionEnabled: result.extensionEnabled !== false,
          showWarnings: result.showWarnings !== false,
          analysisMode: result.analysisMode || "conservative",
        },
      });
    }
  );
}

// Save extension settings
function persistSettings(settings, sendResponse) {
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

// Retrieve recent user reports (up to 10)
function fetchReports(sendResponse) {
  chrome.storage.local.get(["userReports"], (result) => {
    const reports = result.userReports || [];
    sendResponse({ success: true, reports: reports.slice(0, 10) });
  });
}

// Utility: Generate a unique report ID
function generateReportId() {
  return `report_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// On install/update: set default settings
chrome.runtime.onInstalled.addListener((details) => {
  console.log("RedFlag: Extension installed/updated:", details);
  if (details.reason === "install") {
    chrome.storage.local.set({
      extensionEnabled: true,
      showWarnings: true,
      analysisMode: "conservative",
    });
  }
});

// Log storage changes (for debugging)
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log("RedFlag: Storage changed:", changes, "in", namespace);
});
