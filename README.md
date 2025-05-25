# RedFlag: Your Job Scam Detector

Tired of sifting through suspicious job postings? **RedFlag** is a browser extension designed to help you quickly identify potential job scams on LinkedIn and Indeed, right in your browser. Using intelligent, client-side analysis, RedFlag gives you real-time insights so you can apply with confidence.

##  Why RedFlag?

The online job market can be a minefield of fraudulent listings. RedFlag acts as your personal fraud detection assistant, analyzing job descriptions as you browse and flagging common scam indicators. This MVP (Minimum Viable Product) uses a heuristic-based approach, meaning it applies a set of rules and patterns to detect red flags directly on the page, keeping your data private and secure.

## Features

* **Real-time Analysis**: Get instant feedback on job listings as you browse LinkedIn and Indeed.
* **Intelligent Heuristics**: Our rule-based detection system is built to spot common scam patterns and indicators.
* **Clear Visual Feedback**: See analysis results directly on the job listing page, integrated seamlessly into your Browse experience.
* **User Reporting**: Help us improve! Report suspicious listings directly through the extension, contributing to a safer job-seeking community.
* **Privacy-First**: Your data stays with you. All analysis is performed client-side; no information is sent to external servers.
* **Local Storage**: Enjoy offline functionality with reports and settings stored securely on your device.

## Installation

Ready to empower your job search? Follow these simple steps to install RedFlag on your preferred browser:

---

### Chrome

1.  **Download or clone** this repository to your local machine.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle on **"Developer mode"** in the top right corner.
4.  Click **"Load unpacked"** and select the entire `redflag_v1` (or whatever you named the root) folder.
5.  The RedFlag icon should now appear in your browser's extensions toolbar.

---

### Firefox

1.  **Download or clone** this repository.
2.  Open Firefox and go to `about:debugging`.
3.  In the left sidebar, click **"This Firefox"**.
4.  Click **"Load Temporary Add-on"** and select the `manifest.json` file from your downloaded `redflag_v1` folder.
5.  RedFlag will be loaded temporarily. *Note: It will be removed when you close your browser.*

---

### Edge

1.  **Download or clone** this repository.
2.  Open Edge and go to `edge://extensions/`.
3.  Toggle on **"Developer mode"** in the left sidebar.
4.  Click **"Load unpacked"** and select the entire `redflag_v1` (or whatever you named the root) folder.
5.  You should now see RedFlag in your Edge extensions toolbar.

##  Project Structure

.
├── LICENSE
├── README.md
├── assets/
│   ├── icon128.png
│   ├── icon16.png
│   └── icon48.png
├── background.js
├── content.js
├── manifest.json
├── popup.html
└── popup.js
