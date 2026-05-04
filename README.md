# ResumeForge — CSC3100 Final Project

## Overview

ResumeForge is a locally-run resume builder that helps users focus on the content of their resume rather than its formatting. Users store their work experience, skills, certifications, and awards in the app, then selectively combine them into tailored resumes for specific job applications. A live preview updates as selections are made, and the finished resume can be exported as a PDF. AI-powered suggestions are available throughout the app to help users improve their writing.

**Tech stack:** HTML / CSS (Bootstrap 5) / Vanilla JavaScript — Single Page Application  
**Backend:** Node.js + Express — RESTful API  
**Database:** SQLite  
**AI:** Google Gemini (`gemini-2.0-flash` via `@google/genai`)

---

## GitHub Repository

[Paste your public GitHub repo link here]

---

## How AI Was Used

AI tools were used at several stages during the development of this project:

- **Frontend Scaffolding** — Claude Code was used to generate the initial structure and layout of the frontend to accelerate development, including the SPA navigation, form handling, live resume preview, and PDF export logic. From that foundation, all remaining interactive functionality was wired up and the backend was set up manually.

- **Backend & Database** — Claude Code assisted with setting up the SQLite database schema and the Express route structure. All API endpoints and data flow between the frontend and backend were built out and refined from there.

- **Bug Fixes** — AI was used throughout development as a debugging aid to help identify and resolve issues as they came up.

- **GitHub Copilot Autocomplete** — GitHub Copilot autocomplete was enabled for the entire duration of this project and was actively used to increase development efficiency across all files.

- **Code Comments** — Inline comments throughout the codebase were developed with the assistance of GitHub Copilot.

- **This README** — Generated with the assistance of AI and reviewed/edited for accuracy.

---

## Running the Application

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A Google Gemini API key (free tier at [aistudio.google.com](https://aistudio.google.com))

### Setup

1. Clone the repository and navigate into the project folder:
   ```bash
   git clone [your repo URL]
   cd csc3100-resume-builder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:
   ```
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   > Alternatively, skip this step and enter your Gemini API key directly in the app under **Settings → Gemini API Key** after starting the server. The key is stored locally in the SQLite database.

4. Start the server:
   ```bash
   npm start
   ```

5. Open your browser and go to `http://localhost:3000`

The SQLite database (`resumeforge.db`) is created automatically on first run — no setup required.

---

## Sharing

I give permission for this project to be shared with other students and future Professionalism classes.
