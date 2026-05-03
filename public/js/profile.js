// ResumeForge — Profile Section

async function loadProfile() {
  try {
    const objResult = await apiFetch("/api/profile");
    if (objResult.outcome === "success" && objResult.profile) {
      const objP = objResult.profile;
      document.getElementById("txtProfileName").value     = objP.strName     || "";
      document.getElementById("txtProfileEmail").value    = objP.strEmail    || "";
      document.getElementById("txtProfilePhone").value    = objP.strPhone    || "";
      document.getElementById("txtProfileLinkedIn").value = objP.strLinkedIn || "";
      document.getElementById("txtProfileLocation").value = objP.strLocation || "";
      document.getElementById("txtProfileWebsite").value  = objP.strWebsite  || "";
      document.getElementById("txtProfileSummary").value  = objP.strSummary  || "";
    }
  } catch (objErr) {
    console.error("Failed to load profile:", objErr);
  }
}

document.getElementById("frmProfile").addEventListener("submit", async (objEvt) => {
  objEvt.preventDefault();

  const strName = document.getElementById("txtProfileName").value.trim();
  const strEmail = document.getElementById("txtProfileEmail").value.trim();

  let blnError = false;
  let strMessage = "";

  if (!strName) {
    blnError = true;
    strMessage += "<p>Full name is required.</p>";
  }
  if (strEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strEmail)) {
    blnError = true;
    strMessage += "<p>Please enter a valid email address.</p>";
  }

  if (blnError) {
    Swal.fire({ title: "Validation Error", html: strMessage, icon: "error" });
    return;
  }

  const objBtn = document.getElementById("btnSaveProfile");
  objBtn.disabled = true;
  objBtn.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Saving...`;

  try {
    const objResult = await apiFetch("/api/profile", "PUT", {
      strName,
      strEmail:    document.getElementById("txtProfileEmail").value.trim(),
      strPhone:    document.getElementById("txtProfilePhone").value.trim(),
      strLinkedIn: document.getElementById("txtProfileLinkedIn").value.trim(),
      strLocation: document.getElementById("txtProfileLocation").value.trim(),
      strWebsite:  document.getElementById("txtProfileWebsite").value.trim(),
      strSummary:  document.getElementById("txtProfileSummary").value.trim(),
    });
    if (objResult.outcome === "success") {
      Swal.fire({ title: "Saved!", text: "Profile updated successfully.", icon: "success", timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire({ title: "Error", text: objResult.message, icon: "error" });
    }
  } catch (objErr) {
    Swal.fire({ title: "Error", text: "Could not save profile.", icon: "error" });
  } finally {
    objBtn.disabled = false;
    objBtn.innerHTML = `<i class="bi bi-floppy" aria-hidden="true"></i> Save Profile`;
  }
});

// AI suggestion for summary
document.getElementById("btnAiSummary").addEventListener("click", async () => {
  const strText = document.getElementById("txtProfileSummary").value.trim();
  if (!strText) {
    Swal.fire({ title: "Nothing to improve", text: "Write a summary first, then click AI Suggest.", icon: "info" });
    return;
  }

  const objBtn = document.getElementById("btnAiSummary");
  objBtn.disabled = true;
  objBtn.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Thinking...`;

  const objDivSugg = document.getElementById("divSummarySuggestion");
  const objTxtSugg = document.getElementById("txtSummarySuggestionText");

  try {
    const objResult = await getAiSuggestion(strText, "professional summary");
    if (objResult.outcome === "success") {
      objTxtSugg.textContent = objResult.strSuggestion;
      objDivSugg.classList.remove("d-none");
    } else {
      Swal.fire({ title: "AI Error", text: objResult.message, icon: "warning" });
    }
  } catch (objErr) {
    Swal.fire({ title: "Error", text: "Could not reach AI service.", icon: "error" });
  } finally {
    objBtn.disabled = false;
    objBtn.innerHTML = `<i class="bi bi-stars" aria-hidden="true"></i> AI Suggest`;
  }
});

document.getElementById("btnAcceptSummary").addEventListener("click", () => {
  const strSugg = document.getElementById("txtSummarySuggestionText").textContent;
  document.getElementById("txtProfileSummary").value = strSugg;
  document.getElementById("divSummarySuggestion").classList.add("d-none");
});

document.getElementById("btnDismissSummary").addEventListener("click", () => {
  document.getElementById("divSummarySuggestion").classList.add("d-none");
});

// Load on init
document.addEventListener("DOMContentLoaded", loadProfile);
