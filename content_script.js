// RedFlag Content Script
// Runs on LinkedIn job pages to analyze listings for potential scams

console.log("RedFlag: Content script loaded on", window.location.href);

// Configuration
const JOBSCAN_CONFIG = {
  selectors: {
    // LinkedIn selectors
    linkedin: {
      jobTitle:
        ".job-details-jobs-unified-top-card__job-title a, .job-details-jobs-unified-top-card__job-title h1, .jobs-unified-top-card__job-title a",
      company:
        ".job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name a",
      description:
        ".job-details-jobs-unified-top-card__job-description, .jobs-description__content, .jobs-box__html-content",
      salary:
        ".job-details-jobs-unified-top-card__job-insight-view-model-secondary, .jobs-unified-top-card__job-insight",
      location:
        ".job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet",
    },
    // Indeed selectors
    indeed: {
      jobTitle:
        '[data-testid="jobsearch-JobInfoHeader-title"], h1[data-testid="jobsearch-JobInfoHeader-title"]',
      company:
        '[data-testid="inlineHeader-companyName"] a, [data-testid="jobsearch-InlineCompanyRating"] a, .jobsearch-CompanyReview--heading',
      description:
        '#jobDescriptionText, [data-testid="jobsearch-jobDescriptionText"]',
      salary:
        '[data-testid="jobsearch-JobMetadataHeader-item"], .jobsearch-JobMetadataHeader-item',
      location:
        '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle',
    },
  },
  statusElementId: "jobscan-status",
  debounceDelay: 1000,
};

// Global state
let isAnalyzing = false;
let currentJobData = null;
let extensionEnabled = true;
let currentAnalysisResult = null;
let currentSite = null;

// Detect which job site we're on
function detectCurrentSite() {
  const hostname = window.location.hostname;
  if (hostname.includes("linkedin.com")) {
    return "linkedin";
  } else if (hostname.includes("indeed.com")) {
    return "indeed";
  } else if (hostname.includes("monster.com")) {
    return "monster";
  } else if (hostname.includes("builtin.com")) {
    return "builtin";
  } else if (hostname.includes("glassdoor.com")) {
    return "glassdoor";
  } else if (hostname.includes("ziprecruiter.com")) {
    return "ziprecruiter";
  }
  return null; // Site not supported
}

// Initialize extension
init();

async function init() {
  try {
    // Detect current site
    currentSite = detectCurrentSite();
    if (!currentSite) {
      console.log("RedFlag: Unsupported site, not analyzing");
      return;
    }

    console.log("RedFlag: Detected site:", currentSite);

    // Get extension settings
    const response = await sendMessageToBackground({ type: "GET_SETTINGS" });
    if (response.success && response.settings) {
      extensionEnabled = response.settings.extensionEnabled;
    }

    if (!extensionEnabled) {
      console.log("RedFlag: Extension disabled, not analyzing");
      return;
    }

    // Wait for page to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startAnalysis);
    } else {
      startAnalysis();
    }

    // Monitor for page changes (both LinkedIn and Indeed use SPA navigation)
    observePageChanges();
  } catch (error) {
    console.error("RedFlag: Initialization error:", error);
  }
}

// Start analysis of current job listing
function startAnalysis() {
  if (!extensionEnabled || isAnalyzing) return;

  console.log("RedFlag: Starting analysis");

  // Debounce analysis to avoid excessive calls
  clearTimeout(startAnalysis.timeout);
  startAnalysis.timeout = setTimeout(() => {
    analyzeCurrentJob();
  }, JOBSCAN_CONFIG.debounceDelay);
}

// Main analysis function
async function analyzeCurrentJob() {
  if (isAnalyzing) return;

  isAnalyzing = true;

  try {
    // Extract job data from DOM
    const jobData = extractJobData();

    if (!jobData.jobTitle) {
      console.log("RedFlag: No job title found, skipping analysis");
      isAnalyzing = false;
      return;
    }

    currentJobData = jobData;

    // Show analysis status
    injectStatusElement("Analyzing job listing...", "analyzing");

    // Perform heuristic analysis
    const analysisResult = performHeuristicAnalysis(jobData);

    // Display results
    displayAnalysisResult(analysisResult);

    // Send results to background script
    await sendMessageToBackground({
      type: "ANALYSIS_RESULT",
      data: {
        url: window.location.href,
        jobTitle: jobData.jobTitle,
        company: jobData.company,
        analysisResult: analysisResult,
      },
    });
  } catch (error) {
    console.error("RedFlag: Analysis error:", error);
    injectStatusElement("Analysis failed", "error");
  } finally {
    isAnalyzing = false;
  }
}

// Extract job data from current site DOM
if (response.success && response.settings) {
  extensionEnabled = response.settings.extensionEnabled;
}

// Perform heuristic analysis for scam detection
function performHeuristicAnalysis(jobData) {
  const result = {
    riskScore: 0,
    riskLevel: "low", // low, medium, high
    flags: [],
    reasons: [],
  };

  // TODO: Implement core heuristic logic here
  // This is where the main scam detection algorithms will go

  // Example heuristic checks (placeholders for actual implementation):

  // 1. Check for suspicious keywords in job title
  if (jobData.jobTitle) {
    const suspiciousKeywords = [
      "make money fast",
      "work from home",
      "no experience required",
      "earn $",
      "guaranteed income",
      "easy money",
      "get rich",
      "financial freedom",
      "unlimited earning potential",
    ];

    const titleLower = jobData.jobTitle.toLowerCase();
    suspiciousKeywords.forEach((keyword) => {
      if (titleLower.includes(keyword)) {
        result.riskScore += 20;
        result.flags.push("suspicious_keywords");
        result.reasons.push(`Suspicious keyword detected: "${keyword}"`);
      }
    });
  }

  // 2. Check for grammar/spelling issues in description
  if (jobData.description) {
    const grammarIssues = analyzeGrammar(jobData.description);
    if (grammarIssues.score > 3) {
      result.riskScore += 15;
      result.flags.push("poor_grammar");
      result.reasons.push("Multiple grammar/spelling issues detected");
    }
  }

  // 3. Check for suspicious salary claims
  if (jobData.salary) {
    const salaryFlags = analyzeSalary(jobData.salary);
    if (salaryFlags.length > 0) {
      result.riskScore += 10;
      result.flags.push("suspicious_salary");
      result.reasons.push(...salaryFlags);
    }
  }

  // 4. Check company information
  if (jobData.company) {
    const companyFlags = analyzeCompany(jobData.company);
    if (companyFlags.length > 0) {
      result.riskScore += 25;
      result.flags.push("suspicious_company");
      result.reasons.push(...companyFlags);
    }
  }

  // Determine risk level based on score
  if (result.riskScore >= 50) {
    result.riskLevel = "high";
  } else if (result.riskScore >= 25) {
    result.riskLevel = "medium";
  } else {
    result.riskLevel = "low";
  }

  console.log("RedFlag: Analysis result:", result);
  return result;
}

// Analyze grammar and spelling issues (placeholder implementation)
function analyzeGrammar(text) {
  const result = { score: 0, issues: [] };

  // Simple heuristics for grammar issues
  const patterns = [
    /\b\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+[A-Z]/g, // Excessive caps
    /[!]{2,}/g, // Multiple exclamation marks
    /\$\$+/g, // Multiple dollar signs
    /\b[A-Z]{3,}\b/g, // Excessive caps words
    /\b\d+\$\b/g, // Improper dollar placement
  ];

  patterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      result.score += matches.length;
      result.issues.push(`Pattern detected: ${pattern.source}`);
    }
  });

  return result;
}

// Analyze salary information for red flags
function analyzeSalary(salaryText) {
  const flags = [];
  const salaryLower = salaryText.toLowerCase();

  // Check for unrealistic salary claims
  const unrealisticPatterns = [
    /\$\d{4,}.*per day/i,
    /\$\d{3,}.*per hour/i,
    /earn up to \$\d{5,}/i,
    /make \$\d{4,}/i,
  ];

  unrealisticPatterns.forEach((pattern) => {
    if (pattern.test(salaryText)) {
      flags.push("Unrealistic salary claims detected");
    }
  });

  return flags;
}

// Analyze company information for red flags
function analyzeCompany(companyName) {
  const flags = [];
  const companyLower = companyName.toLowerCase();

  // Check for generic/suspicious company names
  const suspiciousNames = [
    "confidential",
    "private",
    "undisclosed",
    "work from home",
    "online opportunity",
    "financial services",
    "marketing company",
  ];

  suspiciousNames.forEach((name) => {
    if (companyLower.includes(name)) {
      flags.push(`Generic company name: "${name}"`);
    }
  });

  return flags;
}

// Inject status element into the page
function injectStatusElement(message, status = "info") {
  // Remove existing status element
  const existing = document.getElementById(JOBSCAN_CONFIG.statusElementId);
  if (existing) {
    existing.remove();
  }

  // Create new status element
  const statusElement = document.createElement("div");
  statusElement.id = JOBSCAN_CONFIG.statusElementId;
  statusElement.className = `jobscan-status jobscan-status-${status}`;
  statusElement.innerHTML = `
    <div class="jobscan-status-content">
      <span class="jobscan-icon">🚩</span>
      <span class="jobscan-message">${message}</span>
    </div>
  `;

  // Find insertion point based on current site
  let containers = [];

  if (currentSite === "linkedin") {
    containers = [
      ".job-details-jobs-unified-top-card__primary-description-container",
      ".jobs-unified-top-card__primary-description",
      ".job-details-jobs-unified-top-card",
      ".jobs-unified-top-card",
      ".jobs-details",
    ];
  } else if (currentSite === "indeed") {
    containers = [
      '[data-testid="jobsearch-JobInfoHeader"]',
      ".jobsearch-JobInfoHeader-title-container",
      ".jobsearch-JobComponent",
      ".jobsearch-SerpJobCard",
      "#viewJobSSRRoot",
    ];
  }

  let inserted = false;
  for (const selector of containers) {
    const container = document.querySelector(selector);
    if (container) {
      container.insertBefore(statusElement, container.firstChild);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    // Fallback: append to body
    document.body.appendChild(statusElement);
  }
}

// Display analysis results
function displayAnalysisResult(result) {
  let message = "";
  let status = "info";

  switch (result.riskLevel) {
    case "high":
      message = `⚠️ High risk job listing detected (Score: ${result.riskScore})`;
      status = "warning";
      break;
    case "medium":
      message = `⚠️ Medium risk job listing (Score: ${result.riskScore})`;
      status = "caution";
      break;
    case "low":
      message = `✅ No significant red flags detected (Score: ${result.riskScore})`;
      status = "success";
      break;
  }

  if (result.reasons.length > 0) {
    message += `\nReasons: ${result.reasons.join(", ")}`;
  }

  injectStatusElement(message, status);
}

// Observe page changes for SPA navigation
function observePageChanges() {
  let currentUrl = window.location.href;

  // Monitor URL changes
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      console.log("RedFlag: URL changed to", currentUrl);

      // Remove existing status element
      const existing = document.getElementById(JOBSCAN_CONFIG.statusElementId);
      if (existing) {
        existing.remove();
      }

      // Start analysis after delay to allow page to load
      setTimeout(startAnalysis, 2000);
    }
  });

  urlObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also monitor for DOM changes that might indicate new job content
  const contentObserver = new MutationObserver(() => {
    // Only trigger if we're on a job page and significant content changed
    if (window.location.href.includes("/jobs/view/")) {
      startAnalysis();
    }
  });

  contentObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("RedFlag: Content script received message:", message);

  switch (message.type) {
    case "GET_CURRENT_JOB":
      sendResponse({
        success: true,
        jobData: currentJobData,
        url: window.location.href,
      });
      break;

    case "REANALYZE":
      startAnalysis();
      sendResponse({ success: true });
      break;

    case "TOGGLE_EXTENSION":
      extensionEnabled = message.enabled;
      if (!extensionEnabled) {
        // Remove status element when disabled
        const existing = document.getElementById(
          JOBSCAN_CONFIG.statusElementId
        );
        if (existing) {
          existing.remove();
        }
      } else {
        startAnalysis();
      }
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: "Unknown message type" });
  }
});
