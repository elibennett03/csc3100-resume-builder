// ResumeForge — Resume Builder Section

let intCurrentResumeId = null;

// Cached data to avoid repeated API calls on every checkbox change
let objBuilderCache = { objProfile: {}, arrJobs: [], arrSkills: [], arrCerts: [], arrAwards: [] };

// Called every time user navigates to the Builder section
async function loadBuilderSection() {
  await loadBuilderData();
  await loadSavedResumeProfiles();
}

async function loadBuilderData() {
  try {
    const objPR = await apiFetch("/api/profile");
    const objJR = await apiFetch("/api/jobs");
    const objSR = await apiFetch("/api/skills");
    const objCR = await apiFetch("/api/certifications");
    const objAR = await apiFetch("/api/awards");

    objBuilderCache.objProfile = objPR.profile || {};
    objBuilderCache.arrJobs    = objJR.jobs || [];
    objBuilderCache.arrSkills  = objSR.skills || [];
    objBuilderCache.arrCerts   = objCR.certifications || [];
    objBuilderCache.arrAwards  = objAR.awards || [];

    renderBuilderJobs(objBuilderCache.arrJobs);
    renderBuilderSkills(objBuilderCache.arrSkills);
    renderBuilderCerts(objBuilderCache.arrCerts);
    renderBuilderAwards(objBuilderCache.arrAwards);
    updateResumePreview();
  } catch (objErr) {
    console.error("Failed to load builder data:", objErr);
  }
}

// ─── Checkbox Renderers ───────────────────────────────────────────────────────

function renderBuilderJobs(arrBuilderJobs) {
  const objContainer = document.getElementById("divBuilderJobs");
  if (arrBuilderJobs.length === 0) {
    objContainer.innerHTML = `<p class="text-muted small">No jobs yet. Add some in Experience.</p>`;
    return;
  }

  objContainer.innerHTML = arrBuilderJobs.map((objJob) => {
    const strDates = `${formatMonthDisplay(objJob.strStartDate)} – ${formatMonthDisplay(objJob.strEndDate)}`;
    const arrResps = objJob.responsibilities || [];
    const strRespCheckboxes = arrResps.map((objResp) => `
      <div class="form-check form-check ms-3 mt-1">
        <input class="form-check-input" type="checkbox" id="chkResp${objResp.intId}"
          data-type="responsibility" data-id="${objResp.intId}" data-job-id="${objJob.intId}"
          checked aria-label="Include responsibility: ${escapeHtml(objResp.strText.substring(0,50))}" />
        <label class="form-check-label" for="chkResp${objResp.intId}">
          ${escapeHtml(objResp.strText.length > 70 ? objResp.strText.substring(0,70) + "…" : objResp.strText)}
        </label>
      </div>
    `).join("");

    return `
      <div class="mb-2">
        <div class="form-check form-check">
          <input class="form-check-input" type="checkbox" id="chkJob${objJob.intId}"
            data-type="job" data-id="${objJob.intId}"
            checked aria-label="Include job: ${escapeHtml(objJob.strTitle)} at ${escapeHtml(objJob.strCompany)}" />
          <label class="form-check-label fw-semibold" for="chkJob${objJob.intId}">
            ${escapeHtml(objJob.strTitle)} <span class="text-muted small fw-normal">@ ${escapeHtml(objJob.strCompany)}</span>
          </label>
        </div>
        <div class="text-muted small ms-4 mb-1">${strDates}</div>
        ${strRespCheckboxes}
      </div>
    `;
  }).join("");

  // Wire up parent job checkbox to toggle all its responsibility checkboxes
  arrBuilderJobs.forEach((objJob) => {
    const objJobChk = document.getElementById(`chkJob${objJob.intId}`);
    if (!objJobChk) return;
    objJobChk.addEventListener("change", () => {
      const arrRespChks = objContainer.querySelectorAll(`[data-job-id="${objJob.intId}"]`);
      arrRespChks.forEach((el) => { el.checked = objJobChk.checked; });
      updateResumePreview();
    });
  });
}

function renderBuilderSkills(arrBuilderSkills) {
  const objContainer = document.getElementById("divBuilderSkills");
  if (arrBuilderSkills.length === 0) {
    objContainer.innerHTML = `<p class="text-muted small">No skills yet.</p>`;
    return;
  }

  objContainer.innerHTML = arrBuilderSkills.map((objSkill) => `
    <div class="form-check form-check">
      <input class="form-check-input" type="checkbox" id="chkSkill${objSkill.intId}"
        data-type="skill" data-id="${objSkill.intId}"
        checked aria-label="Include skill: ${escapeHtml(objSkill.strName)}" />
      <label class="form-check-label" for="chkSkill${objSkill.intId}">
        ${escapeHtml(objSkill.strName)}
        ${objSkill.strCategory !== "General" ? `<span class="text-muted small"> — ${escapeHtml(objSkill.strCategory)}</span>` : ""}
      </label>
    </div>
  `).join("");
}

function renderBuilderCerts(arrBuilderCerts) {
  const objContainer = document.getElementById("divBuilderCerts");
  if (arrBuilderCerts.length === 0) {
    objContainer.innerHTML = `<p class="text-muted small">No certifications yet.</p>`;
    return;
  }

  objContainer.innerHTML = arrBuilderCerts.map((objCert) => `
    <div class="form-check form-check">
      <input class="form-check-input" type="checkbox" id="chkCert${objCert.intId}"
        data-type="certification" data-id="${objCert.intId}"
        checked aria-label="Include certification: ${escapeHtml(objCert.strName)}" />
      <label class="form-check-label" for="chkCert${objCert.intId}">
        ${escapeHtml(objCert.strName)}
        ${objCert.strIssuer ? `<span class="text-muted small"> — ${escapeHtml(objCert.strIssuer)}</span>` : ""}
      </label>
    </div>
  `).join("");
}

function renderBuilderAwards(arrBuilderAwards) {
  const objContainer = document.getElementById("divBuilderAwards");
  if (arrBuilderAwards.length === 0) {
    objContainer.innerHTML = `<p class="text-muted small">No awards yet.</p>`;
    return;
  }

  objContainer.innerHTML = arrBuilderAwards.map((objAward) => `
    <div class="form-check form-check">
      <input class="form-check-input" type="checkbox" id="chkAward${objAward.intId}"
        data-type="award" data-id="${objAward.intId}"
        checked aria-label="Include award: ${escapeHtml(objAward.strName)}" />
      <label class="form-check-label" for="chkAward${objAward.intId}">
        ${escapeHtml(objAward.strName)}
      </label>
    </div>
  `).join("");
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function updateResumePreview() {
  const objData = collectResumeData();
  const strHtml = buildResumeHtml(objData);
  document.getElementById("divResumePreview").innerHTML = strHtml;
}

function collectResumeData() {
  const objProfile = objBuilderCache.objProfile;

  // Checked jobs & responsibilities (from cache)
  const objBuilderJobsEl = document.getElementById("divBuilderJobs");
  const arrJobChks = objBuilderJobsEl.querySelectorAll('[data-type="job"]:checked');
  const arrBuiltJobs = [];

  arrJobChks.forEach((objChk) => {
    const intJobId = parseInt(objChk.dataset.id, 10);
    const objFull  = objBuilderCache.arrJobs.find((j) => j.intId === intJobId);
    if (!objFull) return;
    const arrRespChks = objBuilderJobsEl.querySelectorAll(`[data-job-id="${intJobId}"]:checked`);
    const arrRespFull = [];
    arrRespChks.forEach((objRChk) => {
      const intRespId = parseInt(objRChk.dataset.id, 10);
      if (objFull.responsibilities) {
        objFull.responsibilities.forEach((objResp) => {
          if (objResp.intId === intRespId) arrRespFull.push(objResp);
        });
      }
    });
    arrBuiltJobs.push({
      strTitle:     objFull.strTitle,
      strCompany:   objFull.strCompany,
      strStartDate: objFull.strStartDate,
      strEndDate:   objFull.strEndDate,
      strLocation:  objFull.strLocation,
      arrResps:     arrRespFull,
    });
  });

  // Skills
  const arrSkillIds = [];
  document.getElementById("divBuilderSkills").querySelectorAll('[data-type="skill"]:checked').forEach((el) => {
    arrSkillIds.push(parseInt(el.dataset.id, 10));
  });
  const arrBuiltSkills = [];
  objBuilderCache.arrSkills.forEach((s) => {
    if (arrSkillIds.indexOf(s.intId) !== -1) arrBuiltSkills.push(s);
  });

  // Certs
  const arrCertIds = [];
  document.getElementById("divBuilderCerts").querySelectorAll('[data-type="certification"]:checked').forEach((el) => {
    arrCertIds.push(parseInt(el.dataset.id, 10));
  });
  const arrBuiltCerts = [];
  objBuilderCache.arrCerts.forEach((c) => {
    if (arrCertIds.indexOf(c.intId) !== -1) arrBuiltCerts.push(c);
  });

  // Awards
  const arrAwardIds = [];
  document.getElementById("divBuilderAwards").querySelectorAll('[data-type="award"]:checked').forEach((el) => {
    arrAwardIds.push(parseInt(el.dataset.id, 10));
  });
  const arrBuiltAwards = [];
  objBuilderCache.arrAwards.forEach((a) => {
    if (arrAwardIds.indexOf(a.intId) !== -1) arrBuiltAwards.push(a);
  });

  return { objProfile, arrJobs: arrBuiltJobs, arrSkills: arrBuiltSkills, arrCerts: arrBuiltCerts, arrAwards: arrBuiltAwards };
}

function buildResumeHtml(objData) {
  const objProfile = objData.objProfile;
  const arrJobs    = objData.arrJobs;
  const arrSkills  = objData.arrSkills;
  const arrCerts   = objData.arrCerts;
  const arrAwards  = objData.arrAwards;
  const blnHasContent = arrJobs.length || arrSkills.length || arrCerts.length || arrAwards.length || objProfile.strName;

  if (!blnHasContent) {
    return `<div class="text-center py-5" style="color:#999;"><i class="bi bi-file-earmark-person d-block fs-1 mb-2" style="opacity:0.3;" aria-hidden="true"></i><p>Select items on the left to build your resume.</p></div>`;
  }

  let strHtml = `<div class="resume-header">`;

  if (objProfile.strName) {
    strHtml += `<div class="resume-name">${escapeHtml(objProfile.strName)}</div>`;
  }

  const arrContactParts = [];
  if (objProfile.strPhone)    arrContactParts.push(escapeHtml(objProfile.strPhone));
  if (objProfile.strEmail)    arrContactParts.push(escapeHtml(objProfile.strEmail));
  if (objProfile.strLocation) arrContactParts.push(escapeHtml(objProfile.strLocation));
  if (objProfile.strLinkedIn) arrContactParts.push(`<a href="${escapeHtml(objProfile.strLinkedIn)}" style="color:#444">${escapeHtml(objProfile.strLinkedIn.replace(/^https?:\/\//, ""))}</a>`);
  if (objProfile.strWebsite)  arrContactParts.push(`<a href="${escapeHtml(objProfile.strWebsite)}" style="color:#444">${escapeHtml(objProfile.strWebsite.replace(/^https?:\/\//, ""))}</a>`);

  if (arrContactParts.length) {
    strHtml += `<div class="resume-contact">${arrContactParts.map((s) => `<span>${s}</span>`).join("")}</div>`;
  }

  strHtml += `</div>`; // /resume-header

  // Summary
  if (objProfile.strSummary) {
    strHtml += `
      <div class="resume-section">
        <div class="resume-section-title">Summary</div>
        <p class="resume-summary">${escapeHtml(objProfile.strSummary)}</p>
      </div>
    `;
  }

  // Experience
  if (arrJobs.length) {
    strHtml += `<div class="resume-section"><div class="resume-section-title">Experience</div>`;
    arrJobs.forEach((objJob) => {
      const strStart = formatMonthDisplay(objJob.strStartDate);
      const strEnd   = formatMonthDisplay(objJob.strEndDate);
      const strLoc   = objJob.strLocation ? ` — ${escapeHtml(objJob.strLocation)}` : "";
      strHtml += `
        <div class="resume-job">
          <div class="resume-job-header">
            <div>
              <span class="resume-job-title">${escapeHtml(objJob.strTitle)}</span>
              <span class="resume-job-company">, ${escapeHtml(objJob.strCompany)}${strLoc}</span>
            </div>
            <span class="resume-job-date">${strStart} – ${strEnd}</span>
          </div>
      `;
      if (objJob.arrResps && objJob.arrResps.length) {
        strHtml += `<ul class="resume-resp-list">`;
        objJob.arrResps.forEach((objResp) => {
          strHtml += `<li>${escapeHtml(objResp.strText)}</li>`;
        });
        strHtml += `</ul>`;
      }
      strHtml += `</div>`;
    });
    strHtml += `</div>`;
  }

  // Skills
  if (arrSkills.length) {
    strHtml += `<div class="resume-section"><div class="resume-section-title">Skills</div><div class="resume-skills-grid">`;
    const objByCat = {};
    arrSkills.forEach((s) => {
      const strCat = s.strCategory || "General";
      if (!objByCat[strCat]) objByCat[strCat] = [];
      objByCat[strCat].push(s.strName);
    });
    let arrCatNames = [];
    arrSkills.forEach((objSkill) => {
      const strKey = objSkill.strCategory || "General";
      if (arrCatNames.indexOf(strKey) === -1) arrCatNames.push(strKey);
    });
    arrCatNames.sort();
    arrCatNames.forEach((strCat) => {
      strHtml += `<div class="resume-skill-cat"><strong>${escapeHtml(strCat)}:</strong> ${objByCat[strCat].map(escapeHtml).join(", ")}</div>`;
    });
    strHtml += `</div></div>`;
  }

  // Certifications
  if (arrCerts.length) {
    strHtml += `<div class="resume-section"><div class="resume-section-title">Certifications</div>`;
    arrCerts.forEach((objCert) => {
      strHtml += `
        <div class="resume-cert-item">
          <div>
            <span class="resume-cert-name">${escapeHtml(objCert.strName)}</span>
            ${objCert.strIssuer ? `<span class="resume-cert-issuer"> — ${escapeHtml(objCert.strIssuer)}</span>` : ""}
            ${objCert.strDescription ? `<span class="resume-cert-issuer"> (${escapeHtml(objCert.strDescription)})</span>` : ""}
          </div>
          ${objCert.strDate ? `<span class="resume-cert-date">${formatMonthDisplay(objCert.strDate)}</span>` : ""}
        </div>
      `;
    });
    strHtml += `</div>`;
  }

  // Awards
  if (arrAwards.length) {
    strHtml += `<div class="resume-section"><div class="resume-section-title">Awards & Honors</div>`;
    arrAwards.forEach((objAward) => {
      strHtml += `
        <div class="resume-award-item">
          <div>
            <span class="resume-award-name">${escapeHtml(objAward.strName)}</span>
            ${objAward.strIssuer ? `<span class="resume-award-issuer"> — ${escapeHtml(objAward.strIssuer)}</span>` : ""}
            ${objAward.strDescription ? `<div style="font-size:9pt;color:#555;font-style:italic">${escapeHtml(objAward.strDescription)}</div>` : ""}
          </div>
          ${objAward.strDate ? `<span class="resume-award-date">${formatMonthDisplay(objAward.strDate)}</span>` : ""}
        </div>
      `;
    });
    strHtml += `</div>`;
  }

  return strHtml;
}

// ─── Live Checkbox → Preview Updates ─────────────────────────────────────────

document.getElementById("secBuilder").addEventListener("change", (objEvt) => {
  if (objEvt.target.matches('[data-type]')) {
    updateResumePreview();
  }
});

// ─── Save Resume Profile ──────────────────────────────────────────────────────

document.getElementById("btnSaveResume").addEventListener("click", async () => {
  const objSwalResult = await Swal.fire({
    title: "Save Resume Profile",
    html: `
      <input id="swalResumeName" class="swal2-input" placeholder="Profile name (e.g. SWE @ Google)" />
      <input id="swalResumeTarget" class="swal2-input" placeholder="Target job title (optional)" />
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Save",
    preConfirm: () => {
      const strEnteredName = document.getElementById("swalResumeName").value.trim();
      if (!strEnteredName) {
        Swal.showValidationMessage("Profile name is required.");
        return false;
      }
      return strEnteredName + "||" + document.getElementById("swalResumeTarget").value.trim();
    },
  });

  if (!objSwalResult.isConfirmed || !objSwalResult.value) return;

  const arrParts    = objSwalResult.value.split("||");
  const strSaveName = arrParts[0];
  const strSaveTarget = arrParts[1] || "";
  const arrItems = gatherSelectedItems();

  try {
    let objResult;
    if (intCurrentResumeId) {
      objResult = await apiFetch(`/api/resumes/${intCurrentResumeId}`, "PUT", {
        strName: strSaveName,
        strTargetJob: strSaveTarget,
        arrItems,
      });
    } else {
      objResult = await apiFetch("/api/resumes", "POST", {
        strName: strSaveName,
        strTargetJob: strSaveTarget,
        arrItems,
      });
      if (objResult.outcome === "success") intCurrentResumeId = objResult.intResumeId;
    }

    if (objResult.outcome === "success") {
      await loadSavedResumeProfiles();
      Swal.fire({ title: "Profile Saved!", icon: "success", timer: 1200, showConfirmButton: false });
    } else {
      Swal.fire({ title: "Error", text: objResult.message, icon: "error" });
    }
  } catch (objErr) {
    Swal.fire({ title: "Error", text: "Could not save resume profile.", icon: "error" });
  }
});

function gatherSelectedItems() {
  const arrItems = [];
  document.getElementById("secBuilder").querySelectorAll("[data-type]:checked").forEach((objChk) => {
    arrItems.push({ strItemType: objChk.dataset.type, intItemId: parseInt(objChk.dataset.id, 10) });
  });
  return arrItems;
}

// ─── Load Saved Profiles ──────────────────────────────────────────────────────

async function loadSavedResumeProfiles() {
  try {
    const objResult = await apiFetch("/api/resumes");
    const arrProfiles = objResult.resumes || [];
    const objSel = document.getElementById("selResumeProfile");
    const strCurrentVal = objSel.value;
    objSel.innerHTML = `<option value="">— New Resume —</option>`;
    arrProfiles.forEach((objP) => {
      const objOpt = document.createElement("option");
      objOpt.value = objP.intId;
      objOpt.textContent = objP.strName + (objP.strTargetJob ? ` (${objP.strTargetJob})` : "");
      objSel.appendChild(objOpt);
    });
    objSel.value = strCurrentVal || "";
  } catch (objErr) {
    console.error("Failed to load resume profiles:", objErr);
  }
}

document.getElementById("selResumeProfile").addEventListener("change", async () => {
  const strVal = document.getElementById("selResumeProfile").value;
  if (!strVal) {
    intCurrentResumeId = null;
    return;
  }
  intCurrentResumeId = parseInt(strVal, 10);
  await loadResumeProfile(intCurrentResumeId);
});

async function loadResumeProfile(intId) {
  try {
    const objResult = await apiFetch(`/api/resumes/${intId}`);
    if (objResult.outcome !== "success") return;
    const objResume = objResult.resume;

    // First reload builder data (checkboxes), then set states
    await loadBuilderData();

    // Uncheck everything first
    document.getElementById("secBuilder").querySelectorAll("[data-type]").forEach((el) => {
      el.checked = false;
    });

    // Check only the saved items
    objResume.items.forEach((objItem) => {
      const strSelector = `[data-type="${objItem.strItemType}"][data-id="${objItem.intItemId}"]`;
      const objEl = document.getElementById("secBuilder").querySelector(strSelector);
      if (objEl) objEl.checked = true;
    });

    updateResumePreview();
  } catch (objErr) {
    console.error("Failed to load resume profile:", objErr);
  }
}

document.getElementById("btnDeleteResume").addEventListener("click", async () => {
  if (!intCurrentResumeId) return;
  const objConfirm = await Swal.fire({
    title: "Delete Resume Profile?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Delete",
  });
  if (!objConfirm.isConfirmed) return;
  const objResult = await apiFetch(`/api/resumes/${intCurrentResumeId}`, "DELETE");
  if (objResult.outcome === "success") {
    intCurrentResumeId = null;
    document.getElementById("selResumeProfile").value = "";
    await loadSavedResumeProfiles();
    await loadBuilderData();
  }
});

// ─── PDF Export ───────────────────────────────────────────────────────────────

document.getElementById("btnExportPdf").addEventListener("click", async () => {
  const strName = (objBuilderCache.objProfile && objBuilderCache.objProfile.strName) ? objBuilderCache.objProfile.strName : "Resume";

  const objPrintDiv = document.getElementById("divPrintResume");
  const strResumeHtml = document.getElementById("divResumePreview").innerHTML;

  objPrintDiv.innerHTML = `<div class="resume-paper">${strResumeHtml}</div>`;
  document.getElementById("divPrintArea").classList.remove("d-none");
  document.getElementById("divPrintArea").removeAttribute("aria-hidden");

  const objElement = document.getElementById("divPrintResume");
  const objOptions = {
    margin:       [0.5, 0.5, 0.5, 0.5],
    filename:     `${strName.replace(/\s+/g, "_")}_Resume.pdf`,
    image:        { type: "jpeg", quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: "in", format: "letter", orientation: "portrait" },
  };

  try {
    await html2pdf().set(objOptions).from(objElement).save();
  } catch (objErr) {
    Swal.fire({ title: "Export Error", text: "Could not generate PDF.", icon: "error" });
  } finally {
    document.getElementById("divPrintArea").classList.add("d-none");
    document.getElementById("divPrintArea").setAttribute("aria-hidden", "true");
  }
});
