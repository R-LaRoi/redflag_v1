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
};

// Global state
let currentTab = null;
let currentJobData = null;
let settings = {};
const SUPPORTED_SITES = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  ziprecruiter: "ZipRecruiter",
};

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

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  if (!currentTab || !currentTab.url) {
    showError("Unable to access current tab information");
    disableJobActions();
    return;
  }

  await loadSettings();

  const currentSiteKey = getCurrentSiteKey(currentTab.url);

  if (currentSiteKey) {
    await loadCurrentJobData();
  } else {
    showStatus(
      `Navigate to a supported job site (${Object.values(SUPPORTED_SITES).join(
        ", "
      )}) to use RedFlag`,
      "info"
    );
    disableJobActions();
  }

  await loadRecentReports();
}

function getCurrentSiteKey(url) {
  if (!url) return null;
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.match(/indeed\./i)) return "indeed";
  if (url.includes("ziprecruiter.com")) return "ziprecruiter";
  return null;
}

function getCurrentSiteDisplayName(url) {
  const key = getCurrentSiteKey(url);
  return key ? SUPPORTED_SITES[key] : "Unsupported Site";
}

// Setup event listeners
function setupEventListeners() {
  elements.enableToggle.addEventListener("change", handleEnableToggle);
  elements.warningsToggle.addEventListener("change", handleWarningsToggle);
  elements.analysisMode.addEventListener("change", handleAnalysisModeChange);
  elements.reportJobBtn.addEventListener("click", handleReportJob);
  elements.reanalyzeBtn.addEventListener("click", handleReanalyze);
  elements.modalClose.addEventListener("click", closeReportModal);
  elements.cancelReport.addEventListener("click", closeReportModal);
  elements.reportForm.addEventListener("submit", handleReportSubmit);
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
    if (response.success && response.settings) {
      settings = response.settings;
      elements.enableToggle.checked = settings.extensionEnabled;
      elements.warningsToggle.checked = settings.showWarnings;
      elements.analysisMode.value = settings.analysisMode;
      console.log("RedFlag: Settings loaded:", settings);
    } else {
      console.error(
        "RedFlag: Failed to load settings from background",
        response.error
      );
      settings = {
        extensionEnabled: elements.enableToggle.checked,
        showWarnings: elements.warningsToggle.checked,
        analysisMode: elements.analysisMode.value,
      };
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

    if (response && response.success) {
      currentJobData = response.jobData;

      if (currentJobData && currentJobData.jobTitle) {
        updateJobDisplay(response.url);
        enableJobActions();
        if (response.analysisResult) {
          displayAnalysisStatus(response.analysisResult);
        } else {
          showStatus("Job data loaded, awaiting analysis results...", "info");
        }
      } else {
        currentJobData = null;
        const siteName = getCurrentSiteDisplayName(currentTab.url);
        showStatus(
          `No job details found on this ${siteName} page. Try a specific job listing.`,
          "info"
        );
        disableJobActions();
        updateJobDisplay(response.url);
      }
    } else {
      currentJobData = null;
      showStatus("Failed to retrieve data from this page.", "error");
      disableJobActions();
      updateJobDisplay();
    }
  } catch (error) {
    console.error(
      "RedFlag: Error loading job data from content script:",
      error
    );
    const siteName = getCurrentSiteDisplayName(currentTab.url);
    if (
      error.message &&
      error.message.includes("Could not establish connection")
    ) {
      showStatus(
        `RedFlag isn't active on this ${siteName} page. Refresh or try a specific job.`,
        "error"
      );
    } else {
      showStatus("Error loading job data. Try refreshing.", "error");
    }
    disableJobActions();
    updateJobDisplay();
  }
}

// Display analysis status based on analysisResult from content script
function displayAnalysisStatus(analysisResult) {
  if (!analysisResult) {
    showStatus("Analysis data not available.", "info");
    return;
  }

  let message = "";
  let statusType = "info";
  let subMessage = `Risk Score: ${analysisResult.riskScore}`;

  switch (analysisResult.riskLevel) {
    case "high":
      message = "High Risk Suspected";
      statusType = "error";
      subMessage += ". Proceed with extreme caution.";
      break;
    case "medium":
      message = "Medium Risk Suspected";
      statusType = "warning";
      subMessage += ". Review details carefully.";
      break;
    case "low":
      if (analysisResult.riskScore === 0) {
        message = "No Significant Red Flags";
        subMessage = "Looks generally safe, but always do your own research.";
      } else {
        message = "Low Risk Detected";
        subMessage += ". Verify details independently.";
      }
      statusType = "success";
      break;
    default:
      message = "Analysis Complete";
      statusType = "info";
  }

  if (analysisResult.reasons && analysisResult.reasons.length > 0) {
    subMessage += `\nFlags: ${analysisResult.reasons.slice(0, 1).join("; ")}${
      analysisResult.reasons.length > 1 ? "..." : ""
    }`;
  }

  showStatus(message, statusType, subMessage);
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
    await saveSettings({ extensionEnabled: enabled });
    try {
      await sendMessageToTab({
        type: "TOGGLE_EXTENSION",
        enabled: enabled,
      });
    } catch (tabError) {
      console.warn(
        "RedFlag: Could not message tab to toggle extension (maybe not on a job page):",
        tabError.message
      );
    }

    if (enabled) {
      const currentSiteKey = getCurrentSiteKey(currentTab.url);
      if (currentSiteKey) {
        await loadCurrentJobData();
      } else {
        showStatus(
          `RedFlag enabled. Navigate to a supported job page.`,
          "success"
        );
      }
    } else {
      showStatus("RedFlag disabled", "info");
      disableJobActions();
      currentJobData = null;
      updateJobDisplay();
    }
  } catch (error) {
    const message =
      error && error.message ? error.message : JSON.stringify(error);
    console.error("RedFlag: Error toggling extension:", message, error);
    showError("Could not toggle extension state.");
    elements.enableToggle.checked = !enabled;
  }
}

async function handleWarningsToggle() {
  const showWarnings = elements.warningsToggle.checked;
  try {
    await saveSettings({ showWarnings: showWarnings });
    console.log("RedFlag: Warnings toggle updated:", showWarnings);
  } catch (error) {
    console.error("RedFlag: Error updating warnings setting:", error);
    elements.warningsToggle.checked = !showWarnings;
  }
}

async function handleAnalysisModeChange() {
  const analysisMode = elements.analysisMode.value;
  try {
    await saveSettings({ analysisMode: analysisMode });
    console.log("RedFlag: Analysis mode updated:", analysisMode);
    if (currentJobData && currentJobData.jobTitle) {
      await handleReanalyze();
    }
  } catch (error) {
    console.error("RedFlag: Error updating analysis mode:", error);
  }
}

function handleReportJob() {
  if (!currentJobData || !currentJobData.jobTitle) {
    showError("No job data available to report");
    return;
  }
  openReportModal();
}

async function handleReanalyze() {
  try {
    showStatus("Reanalyzing job...", "loading");
    const response = await sendMessageToTab({ type: "REANALYZE" });
    if (response && response.success) {
      setTimeout(async () => {
        await loadCurrentJobData();
      }, 1500);
    } else {
      showStatus(
        "Reanalysis request failed",
        "error",
        response?.error || "Content script did not respond."
      );
    }
  } catch (error) {
    console.error("RedFlag: Error reanalyzing:", error);
    showStatus("Reanalysis failed", "error", error.message);
  }
}

async function handleReportSubmit(e) {
  e.preventDefault();
  const reportType = elements.reportType.value;
  const reportComment = elements.reportComment.value;

  if (!reportType) {
    showError("Please select a report type");
    return;
  }

  try {
    const reportData = {
      url: currentTab.url,
      jobTitle: currentJobData?.jobTitle || "Unknown Job Title",
      company: currentJobData?.company || "Unknown Company",
      reportType: reportType,
      userComment: reportComment,
    };

    await sendMessageToBackground({ type: "USER_REPORT", data: reportData });
    closeReportModal();
    showStatus("Report submitted successfully", "success");
    setTimeout(() => loadRecentReports(), 500);
  } catch (error) {
    console.error("RedFlag: Error submitting report:", error);
    showError("Failed to submit report");
  }
}

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

// Update job display in the popup
function updateJobDisplay(urlFromContentScript) {
  const displayUrl = urlFromContentScript || currentTab?.url || "N/A";
  if (currentJobData && currentJobData.jobTitle) {
    elements.currentJobTitle.textContent = currentJobData.jobTitle;
    elements.currentJobCompany.textContent =
      currentJobData.company || "Company N/A";
    elements.currentJobUrl.textContent = displayUrl;
    elements.currentJobUrl.title = displayUrl;
    elements.jobInfoSection.style.display = "block";
  } else {
    elements.jobInfoSection.style.display = "none";
    elements.currentJobTitle.textContent = "-";
    elements.currentJobCompany.textContent = "-";
    elements.currentJobUrl.textContent = "-";
  }
}

function updateReportsDisplay(reports) {
  elements.reportCount.textContent = reports.length;
  if (reports.length > 0) {
    elements.reportsList.innerHTML = reports
      .map(
        (report) => `
      <div class="report-item">
        <div class="report-title">${escapeHtml(report.jobTitle)}</div>
        <div class="report-meta">
          <span class="report-type">${escapeHtml(report.reportType)}</span>
          <span class="report-date">${formatDate(report.timestamp)}</span>
        </div>
      </div>`
      )
      .join("");
    elements.reportsSection.style.display = "block";
  } else {
    elements.reportsSection.style.display = "none";
  }
}

function showStatus(message, type = "info", subtitle = "") {
  const icons = {
    loading: "⏳",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };
  elements.statusIcon.textContent = icons[type] || icons.info;
  elements.statusTitle.textContent = message;
  elements.statusSubtitle.textContent =
    subtitle || getStatusSubtitleDefault(type);
  elements.statusCard.className = `status-card status-${type}`;
}

function showError(message, subtitle = "") {
  showStatus(
    message,
    "error",
    subtitle || "Please check console for more details."
  );
}

function getStatusSubtitleDefault(type) {
  const subtitles = {
    loading: "Please wait...",
    success: "Analysis complete.",
    error: "An error occurred.",
    warning: "Proceed with caution.",
    info: "No action required.",
  };
  return subtitles[type] || "";
}

function enableJobActions() {
  elements.reportJobBtn.disabled = false;
  elements.reanalyzeBtn.disabled = false;
}

function disableJobActions() {
  elements.reportJobBtn.disabled = true;
  elements.reanalyzeBtn.disabled = true;
}

function openReportModal() {
  elements.reportModal.style.display = "flex";
  elements.reportType.value = "";
  elements.reportComment.value = "";
}

function closeReportModal() {
  elements.reportModal.style.display = "none";
}

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

function sendMessageToTab(message) {
  return new Promise((resolve, reject) => {
    if (!currentTab || !currentTab.id) {
      reject(new Error("No valid current tab to send message to."));
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

function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  try {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  } catch (e) {
    return "Invalid Date";
  }
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
