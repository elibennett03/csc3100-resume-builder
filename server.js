require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const intPort = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Database Setup ───────────────────────────────────────────────────────────

const db = new sqlite3.Database(path.join(__dirname, "resumeforge.db"), (objErr) => {
  if (objErr) {
    console.error("Database connection error:", objErr.message);
  } else {
    console.log("Connected to SQLite database.");
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

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
      // Insert default row if empty
      db.get("SELECT COUNT(*) as cnt FROM tblProfile", (e, row) => {
        if (row && row.cnt === 0) {
          db.run("INSERT INTO tblProfile (strName) VALUES ('')");
        }
      });
    });

    db.run(`CREATE TABLE IF NOT EXISTS tblJobs (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      strCompany TEXT NOT NULL,
      strTitle TEXT NOT NULL,
      strStartDate TEXT DEFAULT '',
      strEndDate TEXT DEFAULT '',
      strLocation TEXT DEFAULT '',
      dtmCreated TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tblResponsibilities (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      intJobId INTEGER NOT NULL,
      strText TEXT NOT NULL,
      FOREIGN KEY (intJobId) REFERENCES tblJobs(intId) ON DELETE CASCADE
    )`);

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

    db.run(`CREATE TABLE IF NOT EXISTS tblResumeProfiles (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      strName TEXT NOT NULL,
      strTargetJob TEXT DEFAULT '',
      dtmCreated TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tblResumeItems (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      intResumeId INTEGER NOT NULL,
      strItemType TEXT NOT NULL,
      intItemId INTEGER NOT NULL,
      FOREIGN KEY (intResumeId) REFERENCES tblResumeProfiles(intId) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tblSettings (
      intId INTEGER PRIMARY KEY AUTOINCREMENT,
      strKey TEXT UNIQUE NOT NULL,
      strValue TEXT DEFAULT ''
    )`);

    console.log("Database initialized.");
  });
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function dbRun(strSql, arrParams) {
  return new Promise((resolve, reject) => {
    db.run(strSql, arrParams, function (objErr) {
      if (objErr) reject(objErr);
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

app.get("/api/profile", async (req, res) => {
  try {
    const objProfile = await dbGet("SELECT * FROM tblProfile ORDER BY intId LIMIT 1", []);
    res.json({ outcome: "success", profile: objProfile || {} });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

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

// ─── Jobs Routes ─────────────────────────────────────────────────────────────

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

app.delete("/api/resumes/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM tblResumeProfiles WHERE intId=?", [req.params.id]);
    res.json({ outcome: "success", message: "Resume deleted." });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── Settings Routes ──────────────────────────────────────────────────────────

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

  try {
    // Check for user-supplied key in DB first, fall back to .env
    const objKeySetting = await dbGet("SELECT strValue FROM tblSettings WHERE strKey='anthropicApiKey'", []);
    const strApiKey = (objKeySetting && objKeySetting.strValue) ? objKeySetting.strValue : process.env.ANTHROPIC_API_KEY;

    if (!strApiKey || strApiKey === "your_anthropic_api_key_here") {
      return res.status(400).json({ outcome: "error", message: "No Claude API key found. Set ANTHROPIC_API_KEY in your .env file or add one in Settings." });
    }

    const objClient = new Anthropic({ apiKey: strApiKey });

    const strPrompt = `You are a professional resume writing assistant. The user has written the following ${strContext || "resume entry"}. Rewrite it to be more impactful, concise, and action-oriented using strong action verbs and quantifiable achievements where possible. Return ONLY the improved text — no explanation, no bullet point prefix, no quotes.\n\nOriginal: "${strText}"`;

    const objMessage = await objClient.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: strPrompt }],
    });

    const strSuggestion = objMessage.content[0]?.text || "";
    res.json({ outcome: "success", strSuggestion: strSuggestion.trim() });
  } catch (objErr) {
    res.status(500).json({ outcome: "error", message: objErr.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(intPort, () => {
  console.log(`ResumeForge running at http://localhost:${intPort}`);
});
