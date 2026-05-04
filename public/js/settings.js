// ResumeForge — Settings Section
// Handles saving and loading the user's Gemini API key.
// The key is stored in the local SQLite database and never sent anywhere
// except to the Google Gemini API when making AI suggestion requests.

// Load the stored key on page open — show a masked placeholder if one exists
// so the user knows a key is saved without revealing it in plaintext
async function loadSettings() {
  try {
    const objResult = await apiFetch("/api/settings");
    if (objResult.outcome === "success") {
      const strKey = objResult.settings["geminiApiKey"] || "";
      document.getElementById("txtApiKey").value = strKey ? "••••••••••••••••••••••••••••••••••••••••" : "";
      document.getElementById("txtApiKey").dataset.hasKey = strKey ? "true" : "false";
    }
  } catch (objErr) {
    console.error("Failed to load settings:", objErr);
  }
}

// Toggle the API key input between password (hidden) and text (visible) modes
document.getElementById("btnToggleApiKey").addEventListener("click", () => {
  const objInput = document.getElementById("txtApiKey");
  const objIcon  = document.getElementById("btnToggleApiKey").querySelector(".bi");
  if (objInput.type === "password") {
    objInput.type = "text";
    objIcon.className = "bi bi-eye-slash";
  } else {
    objInput.type = "password";
    objIcon.className = "bi bi-eye";
  }
});

// Clear the mask when the user focuses the field so they can type a new key cleanly
document.getElementById("txtApiKey").addEventListener("focus", () => {
  const objInput = document.getElementById("txtApiKey");
  if (objInput.dataset.hasKey === "true" && objInput.value.startsWith("•")) {
    objInput.value = "";
    objInput.dataset.hasKey = "false";
  }
});

document.getElementById("btnSaveApiKey").addEventListener("click", async () => {
  const objInput = document.getElementById("txtApiKey");
  const strKey   = objInput.value.trim();

  // If the user didn't clear the mask, they haven't entered a new key — skip the save
  if (strKey.startsWith("•")) return;

  if (!strKey) {
    Swal.fire({ title: "No Key Entered", text: "Enter your Gemini API key to save it.", icon: "info" });
    return;
  }

  const objBtn = document.getElementById("btnSaveApiKey");
  objBtn.disabled = true;

  try {
    const objResult = await apiFetch("/api/settings", "PUT", { strKey: "geminiApiKey", strValue: strKey });
    if (objResult.outcome === "success") {
      // Re-mask the field after saving so the key isn't left visible on screen
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
