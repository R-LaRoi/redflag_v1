// RedFlag Content Script
// Runs on LinkedIn, Indeed, and other job boards to analyze listings for potential scams

console.log("RedFlag: Content script loaded on", window.location.href);

const JOBSCAN_CONFIG = {
  selectors: {
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

let isAnalyzing = false;
let currentJobData = null;
let extensionEnabled = true;
let currentAnalysisResult = null;
let currentSite = null;

function detectCurrentSite() {
  const hostname = window.location.hostname;
  if (hostname.includes("linkedin.com")) return "linkedin";
  if (hostname.match(/indeed\./i)) return "indeed";
  if (hostname.includes("monster.com")) return "monster";
  if (hostname.includes("builtin.com")) return "builtin";
  if (hostname.includes("glassdoor.com")) return "glassdoor";
  if (hostname.includes("ziprecruiter.com")) return "ziprecruiter";
  return null;
}

init();

async function init() {
  try {
    currentSite = detectCurrentSite();
    if (!currentSite) {
      console.log("RedFlag: Unsupported site, not analyzing");
      return;
    }
    console.log("RedFlag: Detected site:", currentSite);

    const response = await sendMessageToBackground({ type: "GET_SETTINGS" });
    if (response.success && response.settings) {
      extensionEnabled = response.settings.extensionEnabled;
    }
    if (!extensionEnabled) {
      console.log("RedFlag: Extension disabled, not analyzing");
      return;
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startAnalysis);
    } else {
      startAnalysis();
    }
    observePageChanges();
  } catch (error) {
    console.error("RedFlag: Initialization error:", error);
  }
}

// Extract job data for the detected site
function extractJobData() {
  let jobData = {
    jobTitle: "",
    company: "",
    description: "",
    salary: "",
    location: "",
  };

  if (currentSite === "indeed") {
    let titleEl =
      document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]') ||
      document.querySelector(
        'h1[data-testid="jobsearch-JobInfoHeader-title"]'
      ) ||
      document.querySelector("h1.jobsearch-JobInfoHeader-title");
    jobData.jobTitle = titleEl ? titleEl.textContent.trim() : "";

    let companyEl =
      document.querySelector('[data-testid="inlineHeader-companyName"]') ||
      document.querySelector('[data-testid="jobsearch-InlineCompanyRating"]') ||
      document.querySelector(".jobsearch-CompanyReview--heading");
    jobData.company = companyEl ? companyEl.textContent.trim() : "";

    let descEl =
      document.querySelector("#jobDescriptionText") ||
      document.querySelector('[data-testid="jobsearch-jobDescriptionText"]');
    jobData.description = descEl ? descEl.textContent.trim() : "";

    let salaryEl =
      document.querySelector('[data-testid="salary-snippet-container"]') ||
      document.querySelector(
        '[data-testid="jobsearch-JobMetadataHeader-item"]'
      ) ||
      document.querySelector(".jobsearch-JobMetadataHeader-item");
    jobData.salary = salaryEl ? salaryEl.textContent.trim() : "";

    let locEl =
      document.querySelector('[data-testid="job-location"]') ||
      document.querySelector(".jobsearch-JobInfoHeader-subtitle") ||
      document.querySelector(
        '[data-testid="jobsearch-JobInfoHeader-subtitle"]'
      );
    jobData.location = locEl ? locEl.textContent.trim() : "";
  }

  // Add support for other sites as needed...

  console.log("RedFlag: Extracted job data:", jobData);
  return jobData;
}

function startAnalysis() {
  if (!extensionEnabled || isAnalyzing) return;
  clearTimeout(startAnalysis.timeout);
  startAnalysis.timeout = setTimeout(() => {
    analyzeCurrentJob();
  }, JOBSCAN_CONFIG.debounceDelay);
}

async function analyzeCurrentJob() {
  if (isAnalyzing) return;
  isAnalyzing = true;
  try {
    const jobData = extractJobData();
    if (!jobData || !jobData.jobTitle) {
      // Added check for jobData itself
      console.log("RedFlag: No job data or job title found, skipping analysis");
      isAnalyzing = false;
      // Optionally inject a status if needed, or just silently skip
      // injectStatusElement("Could not find job details to analyze.", "info");
      return;
    }
    currentJobData = jobData;
    injectStatusElement("Analyzing job listing...", "analyzing");
    const analysisResult = performHeuristicAnalysis(jobData);
    displayAnalysisResult(analysisResult);
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
    console.error(
      "RedFlag: Analysis error during analyzeCurrentJob:",
      error,
      error.stack
    );
    injectStatusElement("Analysis failed. Check console for details.", "error");
  } finally {
    isAnalyzing = false;
  }
}

function performHeuristicAnalysis(jobData) {
  const result = {
    riskScore: 0,
    riskLevel: "low",
    flags: [],
    reasons: [],
  };

  // Ensure jobData properties are strings, default to empty string if null/undefined
  const jobTitle = jobData.jobTitle || "";
  const description = jobData.description || "";
  const salary = jobData.salary || "";
  const company = jobData.company || "";

  if (jobTitle) {
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
    const titleLower = jobTitle.toLowerCase();
    suspiciousKeywords.forEach((keyword) => {
      if (titleLower.includes(keyword)) {
        result.riskScore += 20;
        result.flags.push("suspicious_keywords");
        result.reasons.push(`Suspicious keyword detected: "${keyword}"`);
      }
    });
  }

  if (description) {
    const grammarIssues = analyzeGrammar(description);
    if (grammarIssues.score > 3) {
      // This threshold might need adjustment based on new patterns
      result.riskScore += 15;
      result.flags.push("poor_grammar");
      result.reasons.push(
        `Multiple grammar/spelling issues detected (${grammarIssues.issues.length} types)`
      );
    }
  }

  if (salary) {
    const salaryFlags = analyzeSalary(salary);
    if (salaryFlags.length > 0) {
      result.riskScore += 10;
      result.flags.push("suspicious_salary");
      result.reasons.push(...salaryFlags);
    }
  }

  if (company) {
    const companyFlags = analyzeCompany(company);
    if (companyFlags.length > 0) {
      result.riskScore += 25;
      result.flags.push("suspicious_company");
      result.reasons.push(...companyFlags);
    }
  }

  if (result.riskScore >= 50) {
    result.riskLevel = "high";
  } else if (result.riskScore >= 25) {
    result.riskLevel = "medium";
  }

  console.log("RedFlag: Analysis result:", result);
  return result;
}

function analyzeGrammar(text) {
  const result = { score: 0, issues: [] };
  if (!text || typeof text !== "string") {
    return result;
  }
  const patterns = [
    /[!]{2,}/g,
    /\?{2,}/g,
    /\$\$+/g,
    /\b\d+\s*\$\b/g,
    /\b[A-Z]{7,}\b/g,
    /\b\w+[.,?!:;]\w+\b/g,
    /\s+[.,?!:;]\B/g,
    /(.)\1{3,}/g,
  ];

  patterns.forEach((pattern) => {
    try {
      const matches = text.match(pattern);
      if (matches) {
        result.score += matches.length; //
        if (!result.issues.includes(pattern.source)) {
          // Avoid duplicate issue types
          result.issues.push(pattern.source);
        }
      }
    } catch (e) {
      console.warn(
        "RedFlag: Error matching pattern in analyzeGrammar",
        pattern,
        e
      );
    }
  });
  return result;
}

function analyzeSalary(salaryText) {
  const flags = [];
  if (!salaryText || typeof salaryText !== "string") {
    return flags;
  }
  const salaryLower = salaryText.toLowerCase();
  const unrealisticPatterns = [
    /\$\d{4,}.*per day/i,
    /\$\d{3,}.*per hour/i,
    /earn up to \$\d{5,}/i,
    /make \$\d{4,}/i,
  ];
  unrealisticPatterns.forEach((pattern) => {
    try {
      if (pattern.test(salaryText)) {
        flags.push("Unrealistic salary claims detected");
      }
    } catch (e) {
      console.warn(
        "RedFlag: Error matching pattern in analyzeSalary",
        pattern,
        e
      );
    }
  });
  return flags;
}

function analyzeCompany(companyName) {
  const flags = [];
  if (!companyName || typeof companyName !== "string") {
    return flags;
  }
  const companyLower = companyName.toLowerCase();
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

function injectStatusElement(message, status = "info") {
  const existing = document.getElementById(JOBSCAN_CONFIG.statusElementId);
  if (existing) existing.remove();

  const statusElement = document.createElement("div");
  statusElement.id = JOBSCAN_CONFIG.statusElementId;
  statusElement.classList.add(
    "jobscan-extension-root",
    "jobscan-status",
    `jobscan-status-${status}`
  );
  statusElement.innerHTML = `
    <div class="jobscan-status-content">
      <span class="jobscan-icon">🚩</span>
      <span class="jobscan-message">${message}</span>
    </div>
  `;

  let containers = [];
  if (currentSite === "linkedin") {
    containers = [
      ".job-details-jobs-unified-top-card__primary-description-container",
      ".jobs-unified-top-card__primary-description",
      ".job-details-jobs-unified-top-card",
      ".jobs-unified-top-card",
      ".jobs-details",
      "main",
    ];
  } else if (currentSite === "indeed") {
    containers = [
      '[data-testid="jobsearch-JobInfoHeader"]',
      ".jobsearch-JobInfoHeader-title-container",
      ".jobsearch-JobComponent",
      ".jobsearch-SerpJobCard",
      "#viewJobSSRRoot",
      "#jobsearch-ViewjobLayout-jobDisplay",
      "body",
    ];
  }

  let inserted = false;
  for (const selector of containers) {
    const container = document.querySelector(selector);
    if (container) {
      if (container.firstChild) {
        container.insertBefore(statusElement, container.firstChild);
      } else {
        container.appendChild(statusElement);
      }
      inserted = true;
      console.log("RedFlag: Status element injected into:", selector);
      break;
    }
  }
  if (!inserted) {
    console.warn(
      "RedFlag: Could not find a suitable container, appending to body."
    );
    document.body.appendChild(statusElement);
  }
}

function displayAnalysisResult(result) {
  let message = "";
  let status = "info";
  switch (result.riskLevel) {
    case "high":
      message = `High risk job listing detected (Score: ${result.riskScore})`;
      status = "warning";
      break;
    case "medium":
      message = `Medium risk job listing (Score: ${result.riskScore})`;
      status = "caution";
      break;
    case "low":
      message = `No significant red flags detected (Score: ${result.riskScore})`;
      status = "success";
      break;
    default:
      message = `Analysis complete (Score: ${result.riskScore})`;
      status = "info";
  }
  if (result.reasons.length > 0) {
    message += `\nIdentified Flags: ${result.reasons.join("; ")}`;
  } else if (result.riskLevel === "low") {
    message += `\nLooks generally safe, but always do your own research.`;
  }
  injectStatusElement(message, status);
}

function observePageChanges() {
  let currentUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      console.log("RedFlag: URL changed to", currentUrl);
      const existing = document.getElementById(JOBSCAN_CONFIG.statusElementId);
      if (existing) existing.remove();
      setTimeout(startAnalysis, 1500);
    }
  });
  urlObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  let jobContentObserverDebounceTimer;
  const jobContentObserver = new MutationObserver((mutationsList) => {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList" || mutation.type === "subtree") {
        const jobTitleElement = document.querySelector(
          JOBSCAN_CONFIG.selectors[currentSite]?.jobTitle
        );
        const jobDescriptionElement = document.querySelector(
          JOBSCAN_CONFIG.selectors[currentSite]?.description
        );

        if (jobTitleElement && jobDescriptionElement) {
          clearTimeout(jobContentObserverDebounceTimer);
          jobContentObserverDebounceTimer = setTimeout(() => {
            console.log(
              "RedFlag: Job content potentially changed, re-analyzing."
            );
            startAnalysis();
          }, 2000);
          return;
        }
      }
    }
  });

  if (currentSite && JOBSCAN_CONFIG.selectors[currentSite]) {
    jobContentObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
    });
  }
}

function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "RedFlag: Error sending message to background:",
          chrome.runtime.lastError.message,
          "Message:",
          message
        );
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("RedFlag: Content script received message:", message);
  switch (message.type) {
    case "GET_CURRENT_JOB":
      if (!currentJobData) {
        currentJobData = extractJobData();
      }
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
      const existingStatusElement = document.getElementById(
        JOBSCAN_CONFIG.statusElementId
      );
      if (!extensionEnabled) {
        if (existingStatusElement) existingStatusElement.remove();
        console.log("RedFlag: Extension explicitly disabled via popup.");
      } else {
        console.log(
          "RedFlag: Extension explicitly enabled via popup, starting analysis."
        );
        startAnalysis();
      }
      sendResponse({ success: true });
      break;
    default:
      console.warn(
        "RedFlag: Content script received unknown message type:",
        message.type
      );
      sendResponse({ success: false, error: "Unknown message type" });
  }
  return true;
});
