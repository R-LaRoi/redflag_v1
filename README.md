# RedFlag: Your Job Scam Detector

**RedFlag** is a browser extension designed to help you quickly identify potential job scams on major job boards, right in your browser. Using intelligent, client-side analysis, RedFlag gives you real-time insights so you can apply with confidence.

## Why RedFlag?

RedFlag acts as your personal fraud detection assistant, analyzing job descriptions as you browse and flagging common scam indicators. This MVP (Minimum Viable Product) uses a heuristic-based approach, meaning it applies a set of rules and patterns to detect red flags directly on the page, keeping your data private and secure.

## Features

- **Real-time Analysis**: Get instant feedback on job listings as you browse.
- **Intelligent Heuristics**: Our rule-based detection system is built to spot common scam patterns and indicators.
- **Clear Visual Feedback**: See analysis results directly on the job listing page, integrated seamlessly into your browsing experience.
- **User Reporting**: Help us improve! Report suspicious listings directly through the extension.
- **Privacy-First**: Your data stays with you. All analysis is performed client-side; no information is sent to external servers.
- **Local Storage**: Settings and reports are stored securely on your device.
- **Configurable Settings**: Adjust analysis sensitivity and display preferences.

## How It Works

RedFlag injects a content script into supported job board pages. This script:

1.  **Extracts Job Data**: It identifies and extracts key information like job title, company name, description, and salary details from the page.
2.  **Performs Heuristic Analysis**: It applies a series of pre-defined rules and pattern checks to the extracted data. These heuristics look for common red flags associated with job scams (e.g., poor grammar, unrealistic salary claims, vague company details, suspicious keywords).
3.  **Displays Results**: An analysis summary and risk score are displayed directly on the page, providing immediate feedback.
4.  **Popup Interface**: The extension popup allows you to manage settings, view job details, report listings, and re-trigger analysis.

All processing happens locally in your browser, ensuring your activity and job search data remain private.

## Screenshots

![App Screenshot](https://github.com/user-attachments/assets/6b6ecb2a-b39f-45e3-bdf6-312cae9fa457)

![App Screenshot](https://github.com/user-attachments/assets/3e4688d4-9c7b-4924-918a-a3c564cf90b9)

![App Screenshot](https://github.com/user-attachments/assets/927d1085-5d17-4caa-a736-546a847fb6eb)

## Supported Websites

RedFlag currently supports heuristic analysis on the following job boards:

- LinkedIn
- Indeed
- ZipRecruiter

## Installation

Ready to empower your job search? Follow these simple steps to install RedFlag:

---

### Google Chrome

1.  **Download or clone** this repository to your local machine.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle on **"Developer mode"** in the top right corner.
4.  Click **"Load unpacked"** and select the entire `redflag_v1` (or the name of the root folder) directory.
5.  The RedFlag icon should now appear in your browser's extensions toolbar.

---

### Mozilla Firefox

1.  **Download or clone** this repository.
2.  Open Firefox and go to `about:debugging`.
3.  In the left sidebar, click **"This Firefox"**.
4.  Click **"Load Temporary Add-on"** and select the `manifest.json` file from the `redflag_v1` (or root) folder.
5.  RedFlag will be loaded temporarily. **Note:** It will be removed when you close Firefox. For persistent installation, the extension would need to be packaged and signed.

---

### Microsoft Edge

1.  **Download or clone** this repository.
2.  Open Edge and go to `edge://extensions/`.
3.  Toggle on **"Developer mode"** in the left sidebar.
4.  Click **"Load unpacked"** and select the entire `redflag_v1` (or root) folder.
5.  You should now see RedFlag in your Edge extensions toolbar.

## Usage

1.  **Navigate**: Go to a job listing page on a supported website (e.g., LinkedIn, Indeed).
2.  **Automatic Analysis**: RedFlag will automatically attempt to analyze the job listing. A status bar will appear on the page indicating the analysis progress and results.
3.  **Popup**:
    - Click the RedFlag icon in your browser's toolbar to open the popup.
    - View current job details and analysis status.
    - Adjust settings (enable/disable, analysis mode, show warnings).
    - Manually reanalyze the current job page.
    - Report suspicious job listings.

## 📂 Project Structure

Here's an overview of the key files in this project:

```
.
├── icon16.svg            # Extension icon (16x16)
├── icon32.svg            # Extension icon (32x32)
├── rfman.png             # Mascot image used in popup
├── README.md             # This file
├── manifest.json         # Core extension configuration file
├── background.js         # Handles background tasks, message passing, storage
├── content_script.js     # Injects into job pages for analysis and UI
├── style.css             # Styles for both popup and content script elements
├── popup.html            # HTML structure for the extension popup
└── popup.js              # JavaScript logic for the extension popup
```

## Troubleshooting

- **"Analysis Failed"**:
  - Ensure you are on a job details page of a supported website.
  - The page structure might have changed. Try the "Reanalyze" button in the popup.
  - Open your browser's developer console (usually F12) and look for error messages prefixed with "RedFlag:" for more details.
- **Status bar not appearing**:
  - Check if the extension is enabled in the popup and in your browser's extension manager.
  - The website might not be supported, or the content script might not have loaded correctly.

If you encounter persistent issues, please [report them](#-contact--feedback).

## Contributing

Contributions are welcome! If you have ideas for improvements, new features, or bug fixes, please consider the following:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or fix (`git checkout -b feature/your-feature-name`).
3.  **Make your changes.**
4.  **Test your changes thoroughly.**
5.  **Commit your changes** (`git commit -am 'Add some feature'`).
6.  **Push to the branch** (`git push origin feature/your-feature-name`).
7.  **Create a new Pull Request.**

Please ensure your code follows the existing style and that any new features are well-documented.

## 📞 Contact / Feedback

Encounter a bug? Have a suggestion?

- **Open an Issue**: If you've found a bug or have a feature request, please [open an issue on GitHub](https://github.com/R-LaRoi/redflag_v1/issues)
- **Feedback**: We appreciate your feedback to make RedFlag better!
