// RedFlag Popup Script
// Handles the extension popup interface and user interactions

console.log("RedFlag: Popup script loaded");

// DOM Elements
const elements = {
  enableToggle: document.getElementById("enable-toggle"),
  warningsToggle: document.getElementById("warnings-toggle"),
  analysisMode: document.getElementById("analysis-mode"),
  reportJobBtn: document.getElementById("report-job-btn"),
  reanalyzeBtn: document.getElementById("reanalyze-btn"),
  statusCard: document.getElementById("status-card"),
  statusIcon: document.getElementById("status-icon"),
  statusTitle: document.getElementById("status-title"),
  statusSubtitle: document.getElementById("status-subtitle"),
  jobInfoSection: document.getElementById("job-info-section"),
  currentJobTitle: document.getElementById("current-job-title"),
  currentJobCompany: document.getElementById("current-job-company"),
  currentJobUrl: document.getElementById("current-job-url"),
  reportsSection: document.getElementById("reports-section"),
  reportsList: document.getElementById("reports-list"),
  reportCount: document.getElementById("report-count"),
  reportModal: document.getElementById("report-modal"),
  reportForm: document.getElementById("report-form"),
  reportType: document.getElementById("report-type"),
  reportComment: document.getElementById("report-comment"),
  modalClose: document.getElementById("modal-close"),
  cancelReport: document.getElementById("cancel-report"),
  helpLink: document.getElementById("help-link"),
  privacyLink: document.getElementById("privacy-link"),
  feedbackLink: document.getElementById("feedback-link"),
};

// Global state
let currentTab = null;
let currentJobData = null;
let settings = {};

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initializePopup();
    setupEventListeners();
  } catch (error) {
    console.error("RedFlag: Popup initialization error:", error);
    showError("Failed to initialize extension");
  }
});

// Initialize popup state
async function initializePopup() {
  console.log("RedFlag: Initializing popup");

  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  if (!currentTab) {
    showError("Unable to access current tab");
    return;
  }

  // Check if we're on a supported job site
  const isLinkedIn = currentTab.url.includes("linkedin.com");
  const isIndeed = currentTab.url.includes("indeed.com");

  if (!isLinkedIn && !isIndeed) {
    showStatus("Navigate to LinkedIn or Indeed to use RedFlag", "info");
    disableJobActions();
    return;
  }

  // Load settings
  await loadSettings();

  // Get current job data if on job page
  const isJobPage =
    (isLinkedIn && currentTab.url.includes("/jobs/")) ||
    (isIndeed && currentTab.url.includes("/viewjob"));

  if (isJobPage) {
    await loadCurrentJobData();
  } else {
    const siteName = isLinkedIn ? "LinkedIn" : "Indeed";
    showStatus(`Navigate to a ${siteName} job listing`, "info");
    disableJobActions();
  }

  // Load recent reports
  await loadRecentReports();
}

// Setup event listeners
function setupEventListeners() {
  // Settings toggles
  elements.enableToggle.addEventListener("change", handleEnableToggle);
  elements.warningsToggle.addEventListener("change", handleWarningsToggle);
  elements.analysisMode.addEventListener("change", handleAnalysisModeChange);

  // Action buttons
  elements.reportJobBtn.addEventListener("click", handleReportJob);
  elements.reanalyzeBtn.addEventListener("click", handleReanalyze);

  // Modal controls
  elements.modalClose.addEventListener("click", closeReportModal);
  elements.cancelReport.addEventListener("click", closeReportModal);
  elements.reportForm.addEventListener("submit", handleReportSubmit);

  // Footer links
  elements.helpLink.addEventListener("click", () => openHelpPage());
  elements.privacyLink.addEventListener("click", () => openPrivacyPage());
  elements.feedbackLink.addEventListener("click", () => openFeedbackPage());

  // Close modal when clicking outside
  elements.reportModal.addEventListener("click", (e) => {
    if (e.target === elements.reportModal) {
      closeReportModal();
    }
  });
}

// Load settings from storage
async function loadSettings() {
  try {
    const response = await sendMessageToBackground({ type: "GET_SETTINGS" });
    if (response.success) {
      settings = response.settings;

      // Update UI with current settings
      elements.enableToggle.checked = settings.extensionEnabled;
      elements.warningsToggle.checked = settings.showWarnings;
      elements.analysisMode.value = settings.analysisMode;

      console.log("RedFlag: Settings loaded:", settings);
    }
  } catch (error) {
    console.error("RedFlag: Error loading settings:", error);
  }
}

// Load current job data from content script
async function loadCurrentJobData() {
  try {
    showStatus("Loading job information...", "loading");

    const response = await sendMessageToTab({ type: "GET_CURRENT_JOB" });
    if (response && response.success && response.jobData) {
      currentJobData = response.jobData;
      updateJobDisplay();
      enableJobActions();
      showStatus("Job loaded successfully", "success");
    } else {
      currentJobData = null;
      showStatus("No job data available", "info");
      disableJobActions();
    }
  } catch (error) {
    console.error("RedFlag: Error loading job data:", error);
    showStatus("Failed to load job data", "error");
    disableJobActions();
  }
}

// Load recent reports
async function loadRecentReports() {
  try {
    const response = await sendMessageToBackground({ type: "GET_REPORTS" });
    if (response.success) {
      updateReportsDisplay(response.reports);
    }
  } catch (error) {
    console.error("RedFlag: Error loading reports:", error);
  }
}

// Handle enable/disable toggle
async function handleEnableToggle() {
  const enabled = elements.enableToggle.checked;

  try {
    // Save setting
    await saveSettings({ extensionEnabled: enabled });

    // Notify content script
    await sendMessageToTab({
      type: "TOGGLE_EXTENSION",
      enabled: enabled,
    });

    // Update UI
    if (enabled) {
      showStatus("RedFlag enabled", "success");
      if (currentJobData) {
        enableJobActions();
      }
    } else {
      showStatus("RedFlag disabled", "info");
      disableJobActions();
    }
  } catch (error) {
    console.error("RedFlag: Error toggling extension:", error);
    elements.enableToggle.checked = !enabled; // Revert on error
  }
}

// Handle warnings toggle
async function handleWarningsToggle() {
  const showWarnings = elements.warningsToggle.checked;

  try {
    await saveSettings({ showWarnings: showWarnings });
    console.log("RedFlag: Warnings toggle updated:", showWarnings);
  } catch (error) {
    console.error("RedFlag: Error updating warnings setting:", error);
    elements.warningsToggle.checked = !showWarnings; // Revert on error
  }
}

// Handle analysis mode change
async function handleAnalysisModeChange() {
  const analysisMode = elements.analysisMode.value;

  try {
    await saveSettings({ analysisMode: analysisMode });
    console.log("RedFlag: Analysis mode updated:", analysisMode);
  } catch (error) {
    console.error("RedFlag: Error updating analysis mode:", error);
  }
}

// Handle report job button
function handleReportJob() {
  if (!currentJobData) {
    showError("No job data available to report");
    return;
  }

  openReportModal();
}

// Handle reanalyze button
async function handleReanalyze() {
  try {
    showStatus("Reanalyzing job...", "loading");

    const response = await sendMessageToTab({ type: "REANALYZE" });
    if (response && response.success) {
      showStatus("Analysis complete", "success");
      // Refresh job data
      setTimeout(() => loadCurrentJobData(), 1000);
    } else {
      showStatus("Analysis failed", "error");
    }
  } catch (error) {
    console.error("RedFlag: Error reanalyzing:", error);
    showStatus("Analysis failed", "error");
  }
}

// Handle report form submission
async function handleReportSubmit(e) {
  e.preventDefault();

  const reportType = elements.reportType.value;
  const reportComment = elements.reportComment.value;

  if (!reportType) {
    showError("Please select a report type");
    return;
  }

  try {
    // Submit report
    const reportData = {
      url: currentTab.url,
      jobTitle: currentJobData?.jobTitle || "Unknown",
      company: currentJobData?.company || "Unknown",
      reportType: reportType,
      userComment: reportComment,
    };

    const response = await sendMessageToBackground({
      type: "USER_REPORT",
      data: reportData,
    });

    closeReportModal();
    showStatus("Report submitted successfully", "success");

    // Refresh reports list
    setTimeout(() => loadRecentReports(), 500);
  } catch (error) {
    console.error("RedFlag: Error submitting report:", error);
    showError("Failed to submit report");
  }
}

// Save settings to storage
async function saveSettings(newSettings) {
  const response = await sendMessageToBackground({
    type: "SAVE_SETTINGS",
    data: newSettings,
  });

  if (response.success) {
    settings = { ...settings, ...newSettings };
  } else {
    throw new Error(response.error || "Failed to save settings");
  }
}

// Update job display
function updateJobDisplay() {
  if (currentJobData) {
    elements.currentJobTitle.textContent = currentJobData.jobTitle || "Unknown";
    elements.currentJobCompany.textContent =
      currentJobData.company || "Unknown";
    elements.currentJobUrl.textContent = currentTab.url;
    elements.currentJobUrl.title = currentTab.url;

    elements.jobInfoSection.style.display = "block";
  } else {
    elements.jobInfoSection.style.display = "none";
  }
}

// Update reports display
function updateReportsDisplay(reports) {
  elements.reportCount.textContent = reports.length;

  if (reports.length > 0) {
    elements.reportsList.innerHTML = reports
      .map(
        (report) => `
      <div class="report-item">
        <div class="report-title">${report.jobTitle}</div>
        <div class="report-meta">
          <span class="report-type">${report.reportType}</span>
          <span class="report-date">${formatDate(report.timestamp)}</span>
        </div>
      </div>
    `
      )
      .join("");

    elements.reportsSection.style.display = "block";
  } else {
    elements.reportsSection.style.display = "none";
  }
}

// Show status message
function showStatus(message, type = "info") {
  const icons = {
    loading: "⏳",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  elements.statusIcon.textContent = icons[type] || icons.info;
  elements.statusTitle.textContent = message;
  elements.statusSubtitle.textContent = getStatusSubtitle(type);

  // Update card styling
  elements.statusCard.className = `status-card status-${type}`;
}

// Show error message
function showError(message) {
  showStatus(message, "error");
}

// Get status subtitle
function getStatusSubtitle(type) {
  const subtitles = {
    loading: "Please wait...",
    success: "Ready to scan",
    error: "Check console for details",
    warning: "Proceed with caution",
    info: "No action required",
  };

  return subtitles[type] || "";
}

// Enable job-related actions
function enableJobActions() {
  elements.reportJobBtn.disabled = false;
  elements.reanalyzeBtn.disabled = false;
}

// Disable job-related actions
function disableJobActions() {
  elements.reportJobBtn.disabled = true;
  elements.reanalyzeBtn.disabled = true;
}

// Open report modal
function openReportModal() {
  elements.reportModal.style.display = "flex";
  elements.reportType.value = "";
  elements.reportComment.value = "";
}

// Close report modal
function closeReportModal() {
  elements.reportModal.style.display = "none";
}

// Open help page
function openHelpPage() {
  chrome.tabs.create({
    url: "https://github.com/jobscan-extension/help",
  });
}

// Open privacy page
function openPrivacyPage() {
  chrome.tabs.create({
    url: "https://github.com/jobscan-extension/privacy",
  });
}

// Open feedback page
function openFeedbackPage() {
  chrome.tabs.create({
    url: "https://github.com/jobscan-extension/feedback",
  });
}

// Send message to background script
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Send message to content script in current tab
function sendMessageToTab(message) {
  return new Promise((resolve, reject) => {
    if (!currentTab) {
      reject(new Error("No current tab"));
      return;
    }

    chrome.tabs.sendMessage(currentTab.id, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Format date for display
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}
