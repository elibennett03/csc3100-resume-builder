// ResumeForge — Certifications Section

let arrCerts = [];
let intEditCertId = null;

async function loadCerts() {
  try {
    const objResult = await apiFetch("/api/certifications");
    if (objResult.outcome === "success") {
      arrCerts = objResult.certifications || [];
      renderCerts();
    }
  } catch (objErr) {
    console.error("Failed to load certifications:", objErr);
  }
}

function renderCerts() {
  const objList  = document.getElementById("divCertsList");
  const objEmpty = document.getElementById("divCertsEmpty");

  objList.querySelectorAll(".cert-item").forEach((el) => el.remove());

  if (arrCerts.length === 0) {
    objEmpty.classList.remove("d-none");
    return;
  }

  objEmpty.classList.add("d-none");

  arrCerts.forEach((objCert) => {
    const strDate = objCert.strDate ? formatMonthDisplay(objCert.strDate) : "";
    const strSub  = [objCert.strIssuer, strDate].filter(Boolean).join(" · ");

    const objItem = document.createElement("div");
    objItem.className = "card mb-2 cert-item";
    objItem.setAttribute("role", "listitem");
    objItem.innerHTML = `
      <div class="card-body py-2 d-flex justify-content-between align-items-center gap-3">
        <div>
          <div class="fw-semibold">${escapeHtml(objCert.strName)}</div>
          ${strSub ? `<div class="small text-muted">${escapeHtml(strSub)}</div>` : ""}
          ${objCert.strDescription ? `<div class="small text-secondary">${escapeHtml(objCert.strDescription)}</div>` : ""}
        </div>
        <div class="d-flex gap-1 flex-shrink-0">
          <button class="btn btn-sm btn-outline-secondary" aria-label="Edit certification"
            data-action="edit-cert" data-id="${objCert.intId}">
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" aria-label="Delete certification"
            data-action="delete-cert" data-id="${objCert.intId}">
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;
    objList.appendChild(objItem);
  });
}

document.getElementById("btnAddCert").addEventListener("click", () => {
  intEditCertId = null;
  document.getElementById("hdgCertForm").textContent = "Add Certification";
  document.getElementById("frmCert").reset();
  document.getElementById("txtCertId").value = "";
  document.getElementById("divCertForm").classList.remove("d-none");
  document.getElementById("txtCertName").focus();
});

document.getElementById("btnCancelCert").addEventListener("click", () => {
  document.getElementById("divCertForm").classList.add("d-none");
});

document.getElementById("frmCert").addEventListener("submit", async (objEvt) => {
  objEvt.preventDefault();

  const strName = document.getElementById("txtCertName").value.trim();
  if (!strName) {
    Swal.fire({ title: "Missing Field", text: "Certification name is required.", icon: "error" });
    return;
  }

  const objPayload = {
    strName,
    strIssuer:      document.getElementById("txtCertIssuer").value.trim(),
    strDate:        document.getElementById("txtCertDate").value,
    strDescription: document.getElementById("txtCertDescription").value.trim(),
  };

  const objBtn = document.getElementById("btnSaveCert");
  objBtn.disabled = true;

  try {
    const objResult = intEditCertId
      ? await apiFetch(`/api/certifications/${intEditCertId}`, "PUT", objPayload)
      : await apiFetch("/api/certifications", "POST", objPayload);

    if (objResult.outcome === "success") {
      document.getElementById("divCertForm").classList.add("d-none");
      await loadCerts();
      Swal.fire({ title: "Saved!", icon: "success", timer: 1200, showConfirmButton: false });
    } else {
      Swal.fire({ title: "Error", text: objResult.message, icon: "error" });
    }
  } catch (objErr) {
    Swal.fire({ title: "Error", text: "Could not save certification.", icon: "error" });
  } finally {
    objBtn.disabled = false;
  }
});

document.getElementById("divCertsList").addEventListener("click", async (objEvt) => {
  const objTarget = objEvt.target.closest("[data-action]");
  if (!objTarget) return;

  const strAction = objTarget.dataset.action;
  const intId = parseInt(objTarget.dataset.id, 10);

  if (strAction === "edit-cert") {
    const objCert = arrCerts.find((c) => c.intId === intId);
    if (!objCert) return;
    intEditCertId = intId;
    document.getElementById("hdgCertForm").textContent     = "Edit Certification";
    document.getElementById("txtCertId").value             = objCert.intId;
    document.getElementById("txtCertName").value           = objCert.strName;
    document.getElementById("txtCertIssuer").value         = objCert.strIssuer || "";
    document.getElementById("txtCertDate").value           = objCert.strDate || "";
    document.getElementById("txtCertDescription").value    = objCert.strDescription || "";
    document.getElementById("divCertForm").classList.remove("d-none");
    document.getElementById("txtCertName").focus();
    document.getElementById("divCertForm").scrollIntoView({ behavior: "smooth" });
  }

  if (strAction === "delete-cert") {
    const objConfirm = await Swal.fire({
      title: "Delete Certification?", icon: "warning", showCancelButton: true, confirmButtonText: "Delete",
    });
    if (!objConfirm.isConfirmed) return;
    const objResult = await apiFetch(`/api/certifications/${intId}`, "DELETE");
    if (objResult.outcome === "success") {
      arrCerts = arrCerts.filter((c) => c.intId !== intId);
      renderCerts();
    }
  }
});

document.addEventListener("DOMContentLoaded", loadCerts);
