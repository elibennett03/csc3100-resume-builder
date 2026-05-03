// ResumeForge — Settings Section

async function loadSettings() {
  try {
    const objResult = await apiFetch("/api/settings");
    if (objResult.outcome === "success") {
      const strKey = objResult.settings["anthropicApiKey"] || "";
      // Show masked version if key exists
      document.getElementById("txtApiKey").value = strKey ? "••••••••••••••••••••••••••••••••••••••••" : "";
      document.getElementById("txtApiKey").dataset.hasKey = strKey ? "true" : "false";
    }
  } catch (objErr) {
    console.error("Failed to load settings:", objErr);
  }
}

document.getElementById("btnToggleApiKey").addEventListener("click", () => {
  const objInput = document.getElementById("txtApiKey");
  const objIcon = document.getElementById("btnToggleApiKey").querySelector(".bi");
  if (objInput.type === "password") {
    objInput.type = "text";
    objIcon.className = "bi bi-eye-slash";
  } else {
    objInput.type = "password";
    objIcon.className = "bi bi-eye";
  }
});

// Clear mask when user starts typing
document.getElementById("txtApiKey").addEventListener("focus", () => {
  const objInput = document.getElementById("txtApiKey");
  if (objInput.dataset.hasKey === "true" && objInput.value.startsWith("•")) {
    objInput.value = "";
    objInput.dataset.hasKey = "false";
  }
});

document.getElementById("btnSaveApiKey").addEventListener("click", async () => {
  const objInput = document.getElementById("txtApiKey");
  const strKey = objInput.value.trim();

  // If user left the masked value, don't overwrite
  if (strKey.startsWith("•")) return;

  if (!strKey) {
    Swal.fire({ title: "No Key Entered", text: "Enter your Gemini API key to save it.", icon: "info" });
    return;
  }

  const objBtn = document.getElementById("btnSaveApiKey");
  objBtn.disabled = true;

  try {
    const objResult = await apiFetch("/api/settings", "PUT", { strKey: "anthropicApiKey", strValue: strKey });
    if (objResult.outcome === "success") {
      objInput.dataset.hasKey = "true";
      objInput.type = "password";
      objInput.value = "••••••••••••••••••••••••••••••••••••••••";
      document.getElementById("btnToggleApiKey").querySelector(".bi").className = "bi bi-eye";
      Swal.fire({ title: "API Key Saved!", text: "Your Gemini API key has been saved locally.", icon: "success", timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire({ title: "Error", text: objResult.message, icon: "error" });
    }
  } catch (objErr) {
    Swal.fire({ title: "Error", text: "Could not save API key.", icon: "error" });
  } finally {
    objBtn.disabled = false;
  }
});

document.getElementById("btnLibraryCredits").addEventListener("click", showLibraryCredits);

document.addEventListener("DOMContentLoaded", loadSettings);
