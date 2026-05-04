// ResumeForge — Awards Section
// Standard CRUD module for awards, honors, and other recognitions.

let arrAwards      = [];   // Local cache of award objects
let intEditAwardId = null; // Tracks which award is being edited (null = add mode)

async function loadAwards() {
  try {
    const objResult = await apiFetch("/api/awards");
    if (objResult.outcome === "success") {
      arrAwards = objResult.awards || [];
      renderAwards();
    }
  } catch (objErr) {
    console.error("Failed to load awards:", objErr);
  }
}

function renderAwards() {
  const objList  = document.getElementById("divAwardsList");
  const objEmpty = document.getElementById("divAwardsEmpty");

  objList.querySelectorAll(".award-item").forEach((el) => el.remove());

  if (arrAwards.length === 0) {
    objEmpty.classList.remove("d-none");
    return;
  }

  objEmpty.classList.add("d-none");

  arrAwards.forEach((objAward) => {
    // Combine issuer and date into a single subtitle line, omitting whichever is absent
    const strDate = objAward.strDate ? formatMonthDisplay(objAward.strDate) : "";
    const strSub  = [objAward.strIssuer, strDate].filter(Boolean).join(" · ");

    const objItem = document.createElement("div");
    objItem.className = "card mb-2 award-item";
    objItem.setAttribute("role", "listitem");
    objItem.innerHTML = `
      <div class="card-body py-2 d-flex justify-content-between align-items-center gap-3">
        <div>
          <div class="fw-semibold">${escapeHtml(objAward.strName)}</div>
          ${strSub ? `<div class="small text-muted">${escapeHtml(strSub)}</div>` : ""}
          ${objAward.strDescription ? `<div class="small text-secondary">${escapeHtml(objAward.strDescription)}</div>` : ""}
        </div>
        <div class="d-flex gap-1 flex-shrink-0">
          <button class="btn btn-sm btn-outline-secondary" aria-label="Edit award"
            data-action="edit-award" data-id="${objAward.intId}">
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" aria-label="Delete award"
            data-action="delete-award" data-id="${objAward.intId}">
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;
    objList.appendChild(objItem);
  });
}

// ─── Award Form ───────────────────────────────────────────────────────────────

document.getElementById("btnAddAward").addEventListener("click", () => {
  intEditAwardId = null;
  document.getElementById("hdgAwardForm").textContent = "Add Award";
  document.getElementById("frmAward").reset();
  document.getElementById("txtAwardId").value = "";
  document.getElementById("divAwardForm").classList.remove("d-none");
  document.getElementById("txtAwardName").focus();
});

document.getElementById("btnCancelAward").addEventListener("click", () => {
  document.getElementById("divAwardForm").classList.add("d-none");
});

document.getElementById("frmAward").addEventListener("submit", async (objEvt) => {
  objEvt.preventDefault();

  const strName = document.getElementById("txtAwardName").value.trim();
  if (!strName) {
    Swal.fire({ title: "Missing Field", text: "Award name is required.", icon: "error" });
    return;
  }

  const objPayload = {
    strName,
    strIssuer:      document.getElementById("txtAwardIssuer").value.trim(),
    strDate:        document.getElementById("txtAwardDate").value,
    strDescription: document.getElementById("txtAwardDescription").value.trim(),
  };

  const objBtn = document.getElementById("btnSaveAward");
  objBtn.disabled = true;

  try {
    const objResult = intEditAwardId
      ? await apiFetch(`/api/awards/${intEditAwardId}`, "PUT", objPayload)
      : await apiFetch("/api/awards", "POST", objPayload);

    if (objResult.outcome === "success") {
      document.getElementById("divAwardForm").classList.add("d-none");
      await loadAwards();
      Swal.fire({ title: "Saved!", icon: "success", timer: 1200, showConfirmButton: false });
    } else {
      Swal.fire({ title: "Error", text: objResult.message, icon: "error" });
    }
  } catch (objErr) {
    Swal.fire({ title: "Error", text: "Could not save award.", icon: "error" });
  } finally {
    objBtn.disabled = false;
  }
});

// Edit and delete actions delegated to the list container
document.getElementById("divAwardsList").addEventListener("click", async (objEvt) => {
  const objTarget = objEvt.target.closest("[data-action]");
  if (!objTarget) return;

  const strAction = objTarget.dataset.action;
  const intId     = parseInt(objTarget.dataset.id, 10);

  if (strAction === "edit-award") {
    const objAward = arrAwards.find((a) => a.intId === intId);
    if (!objAward) return;
    intEditAwardId = intId;
    document.getElementById("hdgAwardForm").textContent    = "Edit Award";
    document.getElementById("txtAwardId").value            = objAward.intId;
    document.getElementById("txtAwardName").value          = objAward.strName;
    document.getElementById("txtAwardIssuer").value        = objAward.strIssuer || "";
    document.getElementById("txtAwardDate").value          = objAward.strDate || "";
    document.getElementById("txtAwardDescription").value   = objAward.strDescription || "";
    document.getElementById("divAwardForm").classList.remove("d-none");
    document.getElementById("txtAwardName").focus();
    document.getElementById("divAwardForm").scrollIntoView({ behavior: "smooth" });
  }

  if (strAction === "delete-award") {
    const objConfirm = await Swal.fire({
      title: "Delete Award?", icon: "warning", showCancelButton: true, confirmButtonText: "Delete",
    });
    if (!objConfirm.isConfirmed) return;
    const objResult = await apiFetch(`/api/awards/${intId}`, "DELETE");
    if (objResult.outcome === "success") {
      // Remove from local cache and re-render to avoid an extra network request
      arrAwards = arrAwards.filter((a) => a.intId !== intId);
      renderAwards();
    }
  }
});

document.addEventListener("DOMContentLoaded", loadAwards);
