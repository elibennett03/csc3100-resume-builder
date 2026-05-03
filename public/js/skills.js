// ResumeForge — Skills Section

let arrSkills = [];
let intEditSkillId = null;

async function loadSkills() {
  try {
    const objResult = await apiFetch("/api/skills");
    if (objResult.outcome === "success") {
      arrSkills = objResult.skills || [];
      renderSkills();
      updateSkillCategoryDatalist();
    }
  } catch (objErr) {
    console.error("Failed to load skills:", objErr);
  }
}

function renderSkills() {
  const objList  = document.getElementById("divSkillsList");
  const objEmpty = document.getElementById("divSkillsEmpty");

  objList.querySelectorAll(".skill-category-block").forEach((el) => el.remove());

  if (arrSkills.length === 0) {
    objEmpty.classList.remove("d-none");
    return;
  }

  objEmpty.classList.add("d-none");

  // Group by category
  const objByCategory = {};
  arrSkills.forEach((objSkill) => {
    const strCat = objSkill.strCategory || "General";
    if (!objByCategory[strCat]) objByCategory[strCat] = [];
    objByCategory[strCat].push(objSkill);
  });

  // Build a sorted array of category names to iterate
  let arrCatNames = [];
  arrSkills.forEach((objSkill) => {
    const strKey = objSkill.strCategory || "General";
    if (arrCatNames.indexOf(strKey) === -1) arrCatNames.push(strKey);
  });
  arrCatNames.sort();

  arrCatNames.forEach((strCat) => {
    const objBlock = document.createElement("div");
    objBlock.className = "card mb-3 skill-category-block";
    objBlock.setAttribute("role", "listitem");

    const strTagsHtml = objByCategory[strCat].map((objSkill) => {
      const strLevel = getLevelLabel(objSkill.intLevel);
      return `
        <span class="badge bg-secondary d-inline-flex align-items-center gap-1 m-1 fs-6 fw-normal">
          ${escapeHtml(objSkill.strName)}
          ${strLevel ? `<span class="opacity-75 small">(${strLevel})</span>` : ""}
          <button class="btn btn-sm p-0 border-0 ms-1" style="line-height:1;" aria-label="Edit ${escapeHtml(objSkill.strName)}"
            data-action="edit-skill" data-id="${objSkill.intId}">
            <i class="bi bi-pencil text-white" style="font-size:0.65rem;" aria-hidden="true"></i>
          </button>
          <button class="btn btn-sm p-0 border-0" style="line-height:1;" aria-label="Delete ${escapeHtml(objSkill.strName)}"
            data-action="delete-skill" data-id="${objSkill.intId}">
            <i class="bi bi-x text-white" style="font-size:0.8rem;" aria-hidden="true"></i>
          </button>
        </span>
      `;
    }).join("");

    objBlock.innerHTML = `
      <div class="card-body py-2 px-3">
        <div class="small fw-semibold text-primary text-uppercase mb-1" style="letter-spacing:0.5px;">${escapeHtml(strCat)}</div>
        <div role="list">${strTagsHtml}</div>
      </div>
    `;
    objList.appendChild(objBlock);
  });
}

function getLevelLabel(intLevel) {
  const arrLabels = ["", "Beginner", "Intermediate", "Advanced", "Expert"];
  return arrLabels[intLevel] || "";
}

function updateSkillCategoryDatalist() {
  const objDl  = document.getElementById("lstSkillCategories");
  let arrCats = [];
  arrSkills.forEach((objSkill) => {
    if (objSkill.strCategory && arrCats.indexOf(objSkill.strCategory) === -1) {
      arrCats.push(objSkill.strCategory);
    }
  });
  objDl.innerHTML = arrCats.map((c) => `<option value="${escapeHtml(c)}">`).join("");
}

document.getElementById("btnAddSkill").addEventListener("click", () => {
  intEditSkillId = null;
  document.getElementById("hdgSkillForm").textContent = "Add Skill";
  document.getElementById("frmSkill").reset();
  document.getElementById("txtSkillId").value = "";
  document.getElementById("divSkillForm").classList.remove("d-none");
  document.getElementById("txtSkillName").focus();
});

document.getElementById("btnCancelSkill").addEventListener("click", () => {
  document.getElementById("divSkillForm").classList.add("d-none");
});

document.getElementById("frmSkill").addEventListener("submit", async (objEvt) => {
  objEvt.preventDefault();

  const strName = document.getElementById("txtSkillName").value.trim();
  if (!strName) {
    Swal.fire({ title: "Missing Field", text: "Skill name is required.", icon: "error" });
    return;
  }

  const objPayload = {
    strName,
    strCategory: document.getElementById("txtSkillCategory").value.trim() || "General",
    intLevel:    parseInt(document.getElementById("selSkillLevel").value, 10),
  };

  const objBtn = document.getElementById("btnSaveSkill");
  objBtn.disabled = true;

  try {
    const objResult = intEditSkillId
      ? await apiFetch(`/api/skills/${intEditSkillId}`, "PUT", objPayload)
      : await apiFetch("/api/skills", "POST", objPayload);

    if (objResult.outcome === "success") {
      document.getElementById("divSkillForm").classList.add("d-none");
      await loadSkills();
    } else {
      Swal.fire({ title: "Error", text: objResult.message, icon: "error" });
    }
  } catch (objErr) {
    Swal.fire({ title: "Error", text: "Could not save skill.", icon: "error" });
  } finally {
    objBtn.disabled = false;
  }
});

document.getElementById("divSkillsList").addEventListener("click", async (objEvt) => {
  const objTarget = objEvt.target.closest("[data-action]");
  if (!objTarget) return;

  const strAction = objTarget.dataset.action;
  const intId = parseInt(objTarget.dataset.id, 10);

  if (strAction === "edit-skill") {
    const objSkill = arrSkills.find((s) => s.intId === intId);
    if (!objSkill) return;
    intEditSkillId = intId;
    document.getElementById("hdgSkillForm").textContent       = "Edit Skill";
    document.getElementById("txtSkillId").value               = objSkill.intId;
    document.getElementById("txtSkillName").value             = objSkill.strName;
    document.getElementById("txtSkillCategory").value         = objSkill.strCategory || "General";
    document.getElementById("selSkillLevel").value            = objSkill.intLevel || 0;
    document.getElementById("divSkillForm").classList.remove("d-none");
    document.getElementById("txtSkillName").focus();
    document.getElementById("divSkillForm").scrollIntoView({ behavior: "smooth" });
  }

  if (strAction === "delete-skill") {
    const objConfirm = await Swal.fire({
      title: "Delete Skill?", icon: "warning", showCancelButton: true, confirmButtonText: "Delete",
    });
    if (!objConfirm.isConfirmed) return;
    const objResult = await apiFetch(`/api/skills/${intId}`, "DELETE");
    if (objResult.outcome === "success") {
      arrSkills = arrSkills.filter((s) => s.intId !== intId);
      renderSkills();
    }
  }
});

document.addEventListener("DOMContentLoaded", loadSkills);
