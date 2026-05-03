// ResumeForge — Jobs / Experience Section

let arrJobs = [];
let intEditJobId = null;

async function loadJobs() {
  try {
    const objResult = await apiFetch("/api/jobs");
    if (objResult.outcome === "success") {
      arrJobs = objResult.jobs || [];
      renderJobs();
    }
  } catch (objErr) {
    console.error("Failed to load jobs:", objErr);
  }
}

function renderJobs() {
  const objList = document.getElementById("divJobsList");
  const objEmpty = document.getElementById("divJobsEmpty");

  objList.querySelectorAll(".job-card").forEach((el) => el.remove());

  if (arrJobs.length === 0) {
    objEmpty.classList.remove("d-none");
    return;
  }

  objEmpty.classList.add("d-none");
  arrJobs.forEach((objJob) => objList.appendChild(buildJobCard(objJob)));
}

function buildJobCard(objJob) {
  const strDates = `${formatMonthDisplay(objJob.strStartDate)} – ${formatMonthDisplay(objJob.strEndDate)}`;
  const strLoc   = objJob.strLocation ? ` · ${objJob.strLocation}` : "";

  const objCard = document.createElement("article");
  objCard.className = "card mb-3 job-card";
  objCard.setAttribute("role", "listitem");
  objCard.dataset.jobId = objJob.intId;

  objCard.innerHTML = `
    <div class="card-header d-flex justify-content-between align-items-center" id="jobHeader${objJob.intId}"
      role="button" aria-expanded="true" aria-controls="jobBody${objJob.intId}" tabindex="0" style="cursor:pointer;">
      <div>
        <span class="fw-semibold">${escapeHtml(objJob.strTitle)}</span>
        <span class="text-muted ms-1">@ ${escapeHtml(objJob.strCompany)}</span>
        <div class="small text-secondary">${strDates}${escapeHtml(strLoc)}</div>
      </div>
      <div class="d-flex gap-1">
        <button class="btn btn-sm btn-outline-secondary" aria-label="Edit job" data-action="edit-job" data-id="${objJob.intId}">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" aria-label="Delete job" data-action="delete-job" data-id="${objJob.intId}">
          <i class="bi bi-trash" aria-hidden="true"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary" aria-label="Toggle details" data-action="toggle-job" data-id="${objJob.intId}">
          <i class="bi bi-chevron-up" aria-hidden="true"></i>
        </button>
      </div>
    </div>
    <div class="card-body" id="jobBody${objJob.intId}">
      <div id="respList${objJob.intId}">
        ${buildResponsibilitiesHtml(objJob)}
      </div>
      <div class="mt-3">
        <div class="d-flex gap-2 align-items-start">
          <textarea class="form-control" id="txtNewResp${objJob.intId}" rows="2"
            placeholder="Add a responsibility bullet point..."
            aria-label="New responsibility for ${escapeHtml(objJob.strTitle)}"></textarea>
          <div class="d-flex flex-column gap-1">
            <button class="btn btn-sm btn-primary" data-action="add-resp" data-id="${objJob.intId}" aria-label="Add responsibility">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" data-action="ai-resp" data-id="${objJob.intId}" aria-label="AI suggestion" title="AI Suggest">
              <i class="bi bi-stars text-warning" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div id="divRespSugg${objJob.intId}" class="d-none rounded mt-2 p-3" style="border:1px solid #9d4edd; background:rgba(157,78,221,0.12);" role="region" aria-label="AI suggestion">
          <div class="small fw-semibold text-uppercase mb-1" style="color:#c084fc; letter-spacing:0.5px;"><i class="bi bi-stars" aria-hidden="true"></i> AI Suggestion</div>
          <p id="txtRespSugg${objJob.intId}" class="mb-2 text-dark"></p>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success" data-action="accept-resp-sugg" data-id="${objJob.intId}">Accept</button>
            <button class="btn btn-sm btn-outline-secondary" data-action="dismiss-resp-sugg" data-id="${objJob.intId}">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  `;

  return objCard;
}

function buildResponsibilitiesHtml(objJob) {
  if (!objJob.responsibilities || objJob.responsibilities.length === 0) {
    return `<p class="text-muted small mb-0" id="respEmpty${objJob.intId}">No responsibilities added yet.</p>`;
  }
  return objJob.responsibilities.map(buildResponsibilityItemHtml).join("");
}

function buildResponsibilityItemHtml(objResp) {
  return `
    <div class="d-flex align-items-start gap-2 py-2 border-bottom border-secondary-subtle" id="respItem${objResp.intId}">
      <span class="flex-grow-1 small">• ${escapeHtml(objResp.strText)}</span>
      <div class="d-flex gap-1 flex-shrink-0">
        <button class="btn btn-sm btn-outline-secondary py-0 px-1" aria-label="Edit responsibility"
          data-action="edit-resp" data-resp-id="${objResp.intId}" data-job-id="${objResp.intJobId}">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger py-0 px-1" aria-label="Delete responsibility"
          data-action="delete-resp" data-resp-id="${objResp.intId}" data-job-id="${objResp.intJobId}">
          <i class="bi bi-trash" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `;
}

// ─── Job Form ─────────────────────────────────────────────────────────────────

document.getElementById("btnAddJob").addEventListener("click", () => {
  intEditJobId = null;
  document.getElementById("hdgJobForm").textContent = "Add Job";
  document.getElementById("frmJob").reset();
  document.getElementById("txtJobId").value = "";
  document.getElementById("divJobForm").classList.remove("d-none");
  document.getElementById("txtJobCompany").focus();
});

document.getElementById("btnCancelJob").addEventListener("click", () => {
  document.getElementById("divJobForm").classList.add("d-none");
});

document.getElementById("frmJob").addEventListener("submit", async (objEvt) => {
  objEvt.preventDefault();

  const strCompany = document.getElementById("txtJobCompany").value.trim();
  const strTitle   = document.getElementById("txtJobTitle").value.trim();

  if (!strCompany || !strTitle) {
    Swal.fire({ title: "Missing Fields", html: "<p>Company and job title are required.</p>", icon: "error" });
    return;
  }

  const objPayload = {
    strCompany,
    strTitle,
    strLocation:  document.getElementById("txtJobLocation").value.trim(),
    strStartDate: document.getElementById("txtJobStart").value,
    strEndDate:   document.getElementById("txtJobEnd").value,
  };

  const objBtn = document.getElementById("btnSaveJob");
  objBtn.disabled = true;
  objBtn.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Saving...`;

  try {
    const objResult = intEditJobId
      ? await apiFetch(`/api/jobs/${intEditJobId}`, "PUT", objPayload)
      : await apiFetch("/api/jobs", "POST", objPayload);

    if (objResult.outcome === "success") {
      document.getElementById("divJobForm").classList.add("d-none");
      await loadJobs();
      Swal.fire({ title: "Saved!", icon: "success", timer: 1200, showConfirmButton: false });
    } else {
      Swal.fire({ title: "Error", text: objResult.message, icon: "error" });
    }
  } catch (objErr) {
    Swal.fire({ title: "Error", text: "Could not save job.", icon: "error" });
  } finally {
    objBtn.disabled = false;
    objBtn.innerHTML = `<i class="bi bi-floppy" aria-hidden="true"></i> Save Job`;
  }
});

// ─── Event Delegation ─────────────────────────────────────────────────────────

document.getElementById("divJobsList").addEventListener("click", async (objEvt) => {
  const objTarget = objEvt.target.closest("[data-action]");
  if (!objTarget) return;

  const strAction = objTarget.dataset.action;
  const intId     = parseInt(objTarget.dataset.id, 10);
  const intRespId = parseInt(objTarget.dataset.respId, 10);
  const intJobId  = parseInt(objTarget.dataset.jobId, 10);

  if (strAction === "edit-job") {
    const objJob = arrJobs.find((j) => j.intId === intId);
    if (!objJob) return;
    intEditJobId = intId;
    document.getElementById("hdgJobForm").textContent        = "Edit Job";
    document.getElementById("txtJobId").value                = objJob.intId;
    document.getElementById("txtJobCompany").value           = objJob.strCompany;
    document.getElementById("txtJobTitle").value             = objJob.strTitle;
    document.getElementById("txtJobLocation").value          = objJob.strLocation || "";
    document.getElementById("txtJobStart").value             = objJob.strStartDate || "";
    document.getElementById("txtJobEnd").value               = objJob.strEndDate || "";
    document.getElementById("divJobForm").classList.remove("d-none");
    document.getElementById("txtJobCompany").focus();
    document.getElementById("divJobForm").scrollIntoView({ behavior: "smooth" });
  }

  if (strAction === "delete-job") {
    const objConfirm = await Swal.fire({
      title: "Delete Job?",
      text: "This will also delete all responsibilities for this job.",
      icon: "warning", showCancelButton: true, confirmButtonText: "Delete",
    });
    if (!objConfirm.isConfirmed) return;
    const objResult = await apiFetch(`/api/jobs/${intId}`, "DELETE");
    if (objResult.outcome === "success") await loadJobs();
    else Swal.fire({ title: "Error", text: objResult.message, icon: "error" });
  }

  if (strAction === "toggle-job") {
    const objBody = document.getElementById(`jobBody${intId}`);
    const objIcon = objTarget.querySelector(".bi");
    const blnHidden = objBody.style.display === "none";
    objBody.style.display = blnHidden ? "" : "none";
    objIcon.className = blnHidden ? "bi bi-chevron-up" : "bi bi-chevron-down";
    objTarget.closest("[aria-expanded]").setAttribute("aria-expanded", blnHidden ? "true" : "false");
  }

  if (strAction === "add-resp") {
    const objTxt = document.getElementById(`txtNewResp${intId}`);
    const strText = objTxt.value.trim();
    if (!strText) return;
    const objResult = await apiFetch(`/api/jobs/${intId}/responsibilities`, "POST", { strText });
    if (objResult.outcome === "success") {
      objTxt.value = "";
      const objJob = arrJobs.find((j) => j.intId === intId);
      if (objJob) {
        if (!objJob.responsibilities) objJob.responsibilities = [];
        objJob.responsibilities.push(objResult.responsibility);
        const objRespList = document.getElementById(`respList${intId}`);
        const objEmpty = objRespList.querySelector(`#respEmpty${intId}`);
        if (objEmpty) objEmpty.remove();
        objRespList.insertAdjacentHTML("beforeend", buildResponsibilityItemHtml(objResult.responsibility));
      }
    } else {
      Swal.fire({ title: "Error", text: objResult.message, icon: "error" });
    }
  }

  if (strAction === "ai-resp") {
    const objTxt = document.getElementById(`txtNewResp${intId}`);
    const strText = objTxt.value.trim();
    if (!strText) {
      Swal.fire({ title: "Nothing to improve", text: "Type a responsibility first.", icon: "info" });
      return;
    }
    objTarget.disabled = true;
    objTarget.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>`;
    const objResult = await getAiSuggestion(strText, "job responsibility bullet point");
    objTarget.disabled = false;
    objTarget.innerHTML = `<i class="bi bi-stars text-warning" aria-hidden="true"></i>`;
    if (objResult.outcome === "success") {
      document.getElementById(`txtRespSugg${intId}`).textContent = objResult.strSuggestion;
      document.getElementById(`divRespSugg${intId}`).classList.remove("d-none");
    } else {
      Swal.fire({ title: "AI Error", text: objResult.message, icon: "warning" });
    }
  }

  if (strAction === "accept-resp-sugg") {
    document.getElementById(`txtNewResp${intId}`).value = document.getElementById(`txtRespSugg${intId}`).textContent;
    document.getElementById(`divRespSugg${intId}`).classList.add("d-none");
  }

  if (strAction === "dismiss-resp-sugg") {
    document.getElementById(`divRespSugg${intId}`).classList.add("d-none");
  }

  if (strAction === "edit-resp") {
    const objRespItem = document.getElementById(`respItem${intRespId}`);
    const strCurrentText = objRespItem.querySelector("span").textContent.replace(/^•\s*/, "");
    const { value: strNewText } = await Swal.fire({
      title: "Edit Responsibility",
      input: "textarea",
      inputValue: strCurrentText,
      inputAttributes: { rows: 3, "aria-label": "Responsibility text" },
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!strNewText || !strNewText.trim()) return;
    const objResult = await apiFetch(`/api/jobs/${intJobId}/responsibilities/${intRespId}`, "PUT", { strText: strNewText.trim() });
    if (objResult.outcome === "success") {
      objRespItem.querySelector("span").textContent = `• ${strNewText.trim()}`;
      const objJob = arrJobs.find((j) => j.intId === intJobId);
      if (objJob) {
        const objResp = objJob.responsibilities.find((r) => r.intId === intRespId);
        if (objResp) objResp.strText = strNewText.trim();
      }
    }
  }

  if (strAction === "delete-resp") {
    const objConfirm = await Swal.fire({
      title: "Delete?", text: "Delete this responsibility?", icon: "warning",
      showCancelButton: true, confirmButtonText: "Delete",
    });
    if (!objConfirm.isConfirmed) return;
    const objResult = await apiFetch(`/api/jobs/${intJobId}/responsibilities/${intRespId}`, "DELETE");
    if (objResult.outcome === "success") {
      document.getElementById(`respItem${intRespId}`).remove();
      const objJob = arrJobs.find((j) => j.intId === intJobId);
      if (objJob) objJob.responsibilities = objJob.responsibilities.filter((r) => r.intId !== intRespId);
    }
  }
});

document.getElementById("divJobsList").addEventListener("keydown", (objEvt) => {
  if (objEvt.key === "Enter" || objEvt.key === " ") {
    const objHeader = objEvt.target.closest("[aria-expanded]");
    if (objHeader) {
      objEvt.preventDefault();
      const objToggleBtn = objHeader.querySelector("[data-action='toggle-job']");
      if (objToggleBtn) objToggleBtn.click();
    }
  }
});

document.addEventListener("DOMContentLoaded", loadJobs);
