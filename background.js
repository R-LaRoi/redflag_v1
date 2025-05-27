// RedFlag Background Script
// Manages message routing, storage, and extension state

console.log("RedFlag: Background script loaded");

// Main message handler for content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("RedFlag: Background received message:", message);

  switch (message.type) {
    case "ANALYSIS_RESULT":
      storeAnalysisResult(message.data, sender, sendResponse);
      return true; // Indicate async response
    case "USER_REPORT":
      storeUserReport(message.data, sendResponse);
      return true; // Indicate async response
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
    // Optionally send a response for unhandled types if senders expect it
    // sendResponse({ success: false, error: "Unknown message type" });
  }
});

// Store analysis results from content script
function storeAnalysisResult(data, sender, sendResponse) {
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
    if (analyses.length > 50) analyses.length = 50; // Limit stored analyses
    chrome.storage.local.set({ recentAnalyses: analyses }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "RedFlag: Error storing analysis result:",
          chrome.runtime.lastError
        );
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else {
        sendResponse({ success: true });
      }
    });
  });
}

// Store user reports from popup
function storeUserReport(data, sendResponse) {
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
      if (chrome.runtime.lastError) {
        console.error(
          "RedFlag: Error storing user report:",
          chrome.runtime.lastError
        );
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else {
        console.log("RedFlag: Report saved locally");
        sendResponse({ success: true });
      }
    });
  });
}

// Retrieve extension settings
function fetchSettings(sendResponse) {
  chrome.storage.local.get(
    ["extensionEnabled", "showWarnings", "analysisMode"],
    (settings) => {
      if (chrome.runtime.lastError) {
        console.error(
          "RedFlag: Error fetching settings:",
          chrome.runtime.lastError
        );
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
        return;
      }
      sendResponse({
        success: true,
        settings: {
          extensionEnabled: settings.extensionEnabled !== false, // Default to true
          showWarnings: settings.showWarnings !== false, // Default to true
          analysisMode: settings.analysisMode || "conservative", // Default to conservative
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
    if (chrome.runtime.lastError) {
      console.error(
        "RedFlag: Error fetching reports:",
        chrome.runtime.lastError
      );
      sendResponse({
        success: false,
        error: chrome.runtime.lastError.message,
        reports: [],
      });
      return;
    }
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
    chrome.storage.local.set(
      {
        extensionEnabled: true,
        showWarnings: true,
        analysisMode: "conservative",
        recentAnalyses: [],
        userReports: [],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            "RedFlag: Error setting default values on install:",
            chrome.runtime.lastError
          );
        } else {
          console.log("RedFlag: Default settings initialized.");
        }
      }
    );
  }
});

// Log storage changes (for debugging)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log(`RedFlag: Storage key "${key}" changed.`);
    }
  }
});
