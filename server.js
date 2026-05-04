// ResumeForge — Express backend
// Provides RESTful API endpoints for all resume data and proxies AI suggestion
// requests to Google Gemini. The SQLite database is created automatically on
// first run — no manual setup required.

require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const intPort = process.env.PORT || 3000;

// Parse JSON request bodies and serve the frontend from /public
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Database Setup ───────────────────────────────────────────────────────────

// Open (or create) the SQLite file next to server.js
const db = new sqlite3.Database(path.join(__dirname, "resumeforge.db"), (objErr) => {
  if (objErr) {
    console.error("Database connection error:", objErr.message);
  } else {
    console.log("Connected to SQLite database.");
    initializeDatabase();
  }
});

// AI (Claude Code) was used to scaffold the database schema below to save time
function initializeDatabase() {
  // db.serialize ensures each statement runs in order, not concurrently
  db.serialize(() => {
    // Enforce foreign-key constraints (SQLite disables them by default)
    db.run("PRAGMA foreign_keys = ON");

    // Single-row profile table — one user per install
    db.run(`CREATE TABLE IF NOT EXISTS tblProfile (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      strName TEXT DEFAULT '',
      strEmail TEXT DEFAULT '',
      strPhone TEXT DEFAULT '',
      strLinkedIn TEXT DEFAULT '',
      strLocation TEXT DEFAULT '',
      strWebsite TEXT DEFAULT '',
      strSummary TEXT DEFAULT ''
    )`, (objErr) => {
      if (objErr) return console.error(objErr);
      // Seed an empty row so GET /api/profile always returns something
      db.get("SELECT COUNT(*) as cnt FROM tblProfile", (e, row) => {
        if (row && row.cnt === 0) {
          db.run("INSERT INTO tblProfile (strName) VALUES ('')");
        }
      });
    });

    // Each job entry — responsibilities are stored separately in tblResponsibilities
    db.run(`CREATE TABLE IF NOT EXISTS tblJobs (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      strCompany TEXT NOT NULL,
      strTitle TEXT NOT NULL,
      strStartDate TEXT DEFAULT '',
      strEndDate TEXT DEFAULT '',
      strLocation TEXT DEFAULT '',
      dtmCreated TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Individual bullet points belonging to a job; cascade-deleted when the job is removed
    db.run(`CREATE TABLE IF NOT EXISTS tblResponsibilities (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      intJobId INTEGER NOT NULL,
      strText TEXT NOT NULL,
      FOREIGN KEY (intJobId) REFERENCES tblJobs(intId) ON DELETE CASCADE
    )`);

    // Skills with an optional category (e.g. "Languages") and proficiency level
    db.run(`CREATE TABLE IF NOT EXISTS tblSkills (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      strName TEXT NOT NULL,
      strCategory TEXT DEFAULT 'General',
      intLevel INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tblCertifications (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      strName TEXT NOT NULL,
      strIssuer TEXT DEFAULT '',
      strDate TEXT DEFAULT '',
      strDescription TEXT DEFAULT ''
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tblAwards (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      strName TEXT NOT NULL,
      strIssuer TEXT DEFAULT '',
      strDate TEXT DEFAULT '',
      strDescription TEXT DEFAULT ''
    )`);

    // A resume profile is a named snapshot of selected items for a specific job application
    db.run(`CREATE TABLE IF NOT EXISTS tblResumeProfiles (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      strName TEXT NOT NULL,
      strTargetJob TEXT DEFAULT '',
      dtmCreated TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Junction table — records which jobs, skills, certs, and awards are included
    // in each saved resume profile
    db.run(`CREATE TABLE IF NOT EXISTS tblResumeItems (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      intResumeId INTEGER NOT NULL,
      strItemType TEXT NOT NULL,
      intItemId INTEGER NOT NULL,
      FOREIGN KEY (intResumeId) REFERENCES tblResumeProfiles(intId) ON DELETE CASCADE
    )`);

    // Key-value store for app settings (e.g. user-supplied Gemini API key)
    db.run(`CREATE TABLE IF NOT EXISTS tblSettings (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      strKey TEXT UNIQUE NOT NULL,
      strValue TEXT DEFAULT ''
    )`);

    console.log("Database initialized.");
  });
}

// ─── DB Promise Helpers ───────────────────────────────────────────────────────
// Wrap the callback-based sqlite3 API in promises so routes can use async/await

function dbRun(strSql, arrParams) {
  return new Promise((resolve, reject) => {
    db.run(strSql, arrParams, function (objErr) {
      if (objErr) reject(objErr);
      // 'this' gives access to lastID and changes from the sqlite3 driver
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(strSql, arrParams) {
  return new Promise((resolve, reject) => {
    db.get(strSql, arrParams, (objErr, objRow) => {
      if (objErr) reject(objErr);
      else resolve(objRow);
    });
  });
}

function dbAll(strSql, arrParams) {
  return new Promise((resolve, reject) => {
    db.all(strSql, arrParams, (objErr, arrRows) => {
      if (objErr) reject(objErr);
      else resolve(arrRows);
    });
  });
}

// ─── Profile Routes ───────────────────────────────────────────────────────────
// Always returns the first (and only) profile row
app.get("/api/profile", async (req, res) => {
  try {
    const objProfile = await dbGet("SELECT * FROM tblProfile ORDER BY intId LIMIT 1", []);
    res.json({ outcome: "success", profile: objProfile || {} });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// Upsert pattern — update the existing row if one exists, otherwise insert
app.put("/api/profile", async (req, res) => {
  const { strName, strEmail, strPhone, strLinkedIn, strLocation, strWebsite, strSummary } = req.body;
  try {
    const objExisting = await dbGet("SELECT intId FROM tblProfile LIMIT 1", []);
    if (objExisting) {
      await dbRun(
        `UPDATE tblProfile SET strName=?, strEmail=?, strPhone=?, strLinkedIn=?, strLocation=?, strWebsite=?, strSummary=? WHERE intId=?`,
        [strName, strEmail, strPhone, strLinkedIn, strLocation, strWebsite, strSummary, objExisting.intId]
      );
    } else {
      await dbRun(
        `INSERT INTO tblProfile (strName, strEmail, strPhone, strLinkedIn, strLocation, strWebsite, strSummary) VALUES (?,?,?,?,?,?,?)`,
        [strName, strEmail, strPhone, strLinkedIn, strLocation, strWebsite, strSummary]
      );
    }
    res.json({ outcome: "success", message: "Profile saved." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── Jobs Routes ──────────────────────────────────────────────────────────────

// Returns all jobs with their responsibilities nested inside each job object
app.get("/api/jobs", async (req, res) => {
  try {
    const arrJobs = await dbAll("SELECT * FROM tblJobs ORDER BY strStartDate DESC", []);
    for (const objJob of arrJobs) {
      objJob.responsibilities = await dbAll(
        "SELECT * FROM tblResponsibilities WHERE intJobId=? ORDER BY intId",
        [objJob.intId]
      );
    }
    res.json({ outcome: "success", jobs: arrJobs });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// Returns the newly created job so the frontend can render it without a second fetch
app.post("/api/jobs", async (req, res) => {
  const { strCompany, strTitle, strStartDate, strEndDate, strLocation } = req.body;
  if (!strCompany || !strTitle) {
    return res.status(400).json({ outcome: "error", message: "Company and title are required." });
  }
  try {
    const objResult = await dbRun(
      "INSERT INTO tblJobs (strCompany, strTitle, strStartDate, strEndDate, strLocation) VALUES (?,?,?,?,?)",
      [strCompany, strTitle, strStartDate || "", strEndDate || "", strLocation || ""]
    );
    const objJob = await dbGet("SELECT * FROM tblJobs WHERE intId=?", [objResult.lastID]);
    objJob.responsibilities = [];
    res.status(201).json({ outcome: "success", job: objJob });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.put("/api/jobs/:id", async (req, res) => {
  const { strCompany, strTitle, strStartDate, strEndDate, strLocation } = req.body;
  try {
    await dbRun(
      "UPDATE tblJobs SET strCompany=?, strTitle=?, strStartDate=?, strEndDate=?, strLocation=? WHERE intId=?",
      [strCompany, strTitle, strStartDate || "", strEndDate || "", strLocation || "", req.params.id]
    );
    res.json({ outcome: "success", message: "Job updated." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// Deleting a job also removes its responsibilities via the ON DELETE CASCADE foreign key
app.delete("/api/jobs/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM tblJobs WHERE intId=?", [req.params.id]);
    res.json({ outcome: "success", message: "Job deleted." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── Responsibilities Routes ──────────────────────────────────────────────────

app.get("/api/jobs/:id/responsibilities", async (req, res) => {
  try {
    const arrRows = await dbAll(
      "SELECT * FROM tblResponsibilities WHERE intJobId=? ORDER BY intId",
      [req.params.id]
    );
    res.json({ outcome: "success", responsibilities: arrRows });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// Returns the new responsibility row so the frontend can append it immediately
app.post("/api/jobs/:id/responsibilities", async (req, res) => {
  const { strText } = req.body;
  if (!strText) return res.status(400).json({ outcome: "error", message: "Text is required." });
  try {
    const objResult = await dbRun(
      "INSERT INTO tblResponsibilities (intJobId, strText) VALUES (?,?)",
      [req.params.id, strText]
    );
    const objRow = await dbGet("SELECT * FROM tblResponsibilities WHERE intId=?", [objResult.lastID]);
    res.status(201).json({ outcome: "success", responsibility: objRow });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.put("/api/jobs/:id/responsibilities/:rid", async (req, res) => {
  const { strText } = req.body;
  try {
    await dbRun("UPDATE tblResponsibilities SET strText=? WHERE intId=?", [strText, req.params.rid]);
    res.json({ outcome: "success", message: "Responsibility updated." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.delete("/api/jobs/:id/responsibilities/:rid", async (req, res) => {
  try {
    await dbRun("DELETE FROM tblResponsibilities WHERE intId=?", [req.params.rid]);
    res.json({ outcome: "success", message: "Responsibility deleted." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── Skills Routes ────────────────────────────────────────────────────────────

// Sorted by category then name so the frontend can group them without sorting itself
app.get("/api/skills", async (req, res) => {
  try {
    const arrSkills = await dbAll("SELECT * FROM tblSkills ORDER BY strCategory, strName", []);
    res.json({ outcome: "success", skills: arrSkills });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.post("/api/skills", async (req, res) => {
  const { strName, strCategory, intLevel } = req.body;
  if (!strName) return res.status(400).json({ outcome: "error", message: "Name is required." });
  try {
    const objResult = await dbRun(
      "INSERT INTO tblSkills (strName, strCategory, intLevel) VALUES (?,?,?)",
      [strName, strCategory || "General", intLevel || 0]
    );
    const objSkill = await dbGet("SELECT * FROM tblSkills WHERE intId=?", [objResult.lastID]);
    res.status(201).json({ outcome: "success", skill: objSkill });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.put("/api/skills/:id", async (req, res) => {
  const { strName, strCategory, intLevel } = req.body;
  try {
    await dbRun(
      "UPDATE tblSkills SET strName=?, strCategory=?, intLevel=? WHERE intId=?",
      [strName, strCategory || "General", intLevel || 0, req.params.id]
    );
    res.json({ outcome: "success", message: "Skill updated." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.delete("/api/skills/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM tblSkills WHERE intId=?", [req.params.id]);
    res.json({ outcome: "success", message: "Skill deleted." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── Certifications Routes ────────────────────────────────────────────────────

app.get("/api/certifications", async (req, res) => {
  try {
    const arrCerts = await dbAll("SELECT * FROM tblCertifications ORDER BY strDate DESC", []);
    res.json({ outcome: "success", certifications: arrCerts });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.post("/api/certifications", async (req, res) => {
  const { strName, strIssuer, strDate, strDescription } = req.body;
  if (!strName) return res.status(400).json({ outcome: "error", message: "Name is required." });
  try {
    const objResult = await dbRun(
      "INSERT INTO tblCertifications (strName, strIssuer, strDate, strDescription) VALUES (?,?,?,?)",
      [strName, strIssuer || "", strDate || "", strDescription || ""]
    );
    const objCert = await dbGet("SELECT * FROM tblCertifications WHERE intId=?", [objResult.lastID]);
    res.status(201).json({ outcome: "success", certification: objCert });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.put("/api/certifications/:id", async (req, res) => {
  const { strName, strIssuer, strDate, strDescription } = req.body;
  try {
    await dbRun(
      "UPDATE tblCertifications SET strName=?, strIssuer=?, strDate=?, strDescription=? WHERE intId=?",
      [strName, strIssuer || "", strDate || "", strDescription || "", req.params.id]
    );
    res.json({ outcome: "success", message: "Certification updated." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.delete("/api/certifications/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM tblCertifications WHERE intId=?", [req.params.id]);
    res.json({ outcome: "success", message: "Certification deleted." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── Awards Routes ────────────────────────────────────────────────────────────

app.get("/api/awards", async (req, res) => {
  try {
    const arrAwards = await dbAll("SELECT * FROM tblAwards ORDER BY strDate DESC", []);
    res.json({ outcome: "success", awards: arrAwards });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.post("/api/awards", async (req, res) => {
  const { strName, strIssuer, strDate, strDescription } = req.body;
  if (!strName) return res.status(400).json({ outcome: "error", message: "Name is required." });
  try {
    const objResult = await dbRun(
      "INSERT INTO tblAwards (strName, strIssuer, strDate, strDescription) VALUES (?,?,?,?)",
      [strName, strIssuer || "", strDate || "", strDescription || ""]
    );
    const objAward = await dbGet("SELECT * FROM tblAwards WHERE intId=?", [objResult.lastID]);
    res.status(201).json({ outcome: "success", award: objAward });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.put("/api/awards/:id", async (req, res) => {
  const { strName, strIssuer, strDate, strDescription } = req.body;
  try {
    await dbRun(
      "UPDATE tblAwards SET strName=?, strIssuer=?, strDate=?, strDescription=? WHERE intId=?",
      [strName, strIssuer || "", strDate || "", strDescription || "", req.params.id]
    );
    res.json({ outcome: "success", message: "Award updated." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

app.delete("/api/awards/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM tblAwards WHERE intId=?", [req.params.id]);
    res.json({ outcome: "success", message: "Award deleted." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── Resume Profiles Routes ───────────────────────────────────────────────────

app.get("/api/resumes", async (req, res) => {
  try {
    const arrProfiles = await dbAll("SELECT * FROM tblResumeProfiles ORDER BY dtmCreated DESC", []);
    res.json({ outcome: "success", resumes: arrProfiles });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// Creates the profile header row then inserts each selected item into tblResumeItems
app.post("/api/resumes", async (req, res) => {
  const { strName, strTargetJob, arrItems } = req.body;
  if (!strName) return res.status(400).json({ outcome: "error", message: "Name is required." });
  try {
    const objResult = await dbRun(
      "INSERT INTO tblResumeProfiles (strName, strTargetJob) VALUES (?,?)",
      [strName, strTargetJob || ""]
    );
    const intResumeId = objResult.lastID;
    if (arrItems && arrItems.length > 0) {
      for (const objItem of arrItems) {
        await dbRun(
          "INSERT INTO tblResumeItems (intResumeId, strItemType, intItemId) VALUES (?,?,?)",
          [intResumeId, objItem.strItemType, objItem.intItemId]
        );
      }
    }
    res.status(201).json({ outcome: "success", intResumeId });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// Returns the profile with its item list nested so the builder can restore checkbox state
app.get("/api/resumes/:id", async (req, res) => {
  try {
    const objResume = await dbGet("SELECT * FROM tblResumeProfiles WHERE intId=?", [req.params.id]);
    if (!objResume) return res.status(404).json({ outcome: "error", message: "Not found." });
    objResume.items = await dbAll("SELECT * FROM tblResumeItems WHERE intResumeId=?", [req.params.id]);
    res.json({ outcome: "success", resume: objResume });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// Delete-and-reinsert items to handle additions, removals, and reorders in one step
app.put("/api/resumes/:id", async (req, res) => {
  const { strName, strTargetJob, arrItems } = req.body;
  try {
    await dbRun(
      "UPDATE tblResumeProfiles SET strName=?, strTargetJob=? WHERE intId=?",
      [strName, strTargetJob || "", req.params.id]
    );
    await dbRun("DELETE FROM tblResumeItems WHERE intResumeId=?", [req.params.id]);
    if (arrItems && arrItems.length > 0) {
      for (const objItem of arrItems) {
        await dbRun(
          "INSERT INTO tblResumeItems (intResumeId, strItemType, intItemId) VALUES (?,?,?)",
          [req.params.id, objItem.strItemType, objItem.intItemId]
        );
      }
    }
    res.json({ outcome: "success", message: "Resume updated." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// Cascade via foreign key also removes all tblResumeItems rows for this profile
app.delete("/api/resumes/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM tblResumeProfiles WHERE intId=?", [req.params.id]);
    res.json({ outcome: "success", message: "Resume deleted." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── Settings Routes ──────────────────────────────────────────────────────────

// Returns all settings as a flat key-value object for easy lookup on the frontend
app.get("/api/settings", async (req, res) => {
  try {
    const arrRows = await dbAll("SELECT * FROM tblSettings", []);
    const objSettings = {};
    arrRows.forEach((row) => {
      objSettings[row.strKey] = row.strValue;
    });
    res.json({ outcome: "success", settings: objSettings });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// Upsert via ON CONFLICT so callers don't need to know if the key already exists
app.put("/api/settings", async (req, res) => {
  const { strKey, strValue } = req.body;
  if (!strKey) return res.status(400).json({ outcome: "error", message: "Key is required." });
  try {
    await dbRun(
      "INSERT INTO tblSettings (strKey, strValue) VALUES (?,?) ON CONFLICT(strKey) DO UPDATE SET strValue=excluded.strValue",
      [strKey, strValue || ""]
    );
    res.json({ outcome: "success", message: "Setting saved." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── AI Suggestion Route ──────────────────────────────────────────────────────

app.post("/api/ai/suggest", async (req, res) => {
  const { strText, strContext } = req.body;
  if (!strText) return res.status(400).json({ outcome: "error", message: "Text is required." });

  // strContext customizes the prompt based on which field is being improved
  // (e.g. "job responsibility bullet point", "professional summary", "skill name")
  const strPrompt = `You are a professional resume writing assistant. The user has written the following ${strContext || "resume entry"}. Rewrite it to be more impactful, concise, and action-oriented using strong action verbs and quantifiable achievements where possible. Return ONLY the improved text — no explanation, no bullet point prefix, no quotes.\n\nOriginal: "${strText}"`;

  try {
    // Prefer the key the user entered in Settings; fall back to the .env value
    const objGeminiSetting = await dbGet("SELECT strValue FROM tblSettings WHERE strKey='geminiApiKey'", []);
    const strGeminiKey = (objGeminiSetting && objGeminiSetting.strValue) ? objGeminiSetting.strValue : process.env.GEMINI_API_KEY;

    if (!strGeminiKey) {
      return res.status(400).json({
        outcome: "error",
        message: "No Gemini API key configured. Add your key in Settings or set GEMINI_API_KEY in your .env file.",
      });
    }

    const ai = new GoogleGenAI({ apiKey: strGeminiKey });
    const objResult = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: strPrompt,
    });
    const strSuggestion = objResult.text.trim();
    return res.json({ outcome: "success", strSuggestion });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(intPort, () => {
  console.log(`ResumeForge running at http://localhost:${intPort}`);
});
