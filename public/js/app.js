// ResumeForge — Main SPA Controller

const arrNavItems = [
  { strBtnId: "btnNavProfile",  strSecId: "secProfile"  },
  { strBtnId: "btnNavJobs",     strSecId: "secJobs"     },
  { strBtnId: "btnNavSkills",   strSecId: "secSkills"   },
  { strBtnId: "btnNavCerts",    strSecId: "secCerts"    },
  { strBtnId: "btnNavAwards",   strSecId: "secAwards"   },
  { strBtnId: "btnNavBuilder",  strSecId: "secBuilder"  },
  { strBtnId: "btnNavSettings", strSecId: "secSettings" },
];

function navigateTo(strSectionId) {
  arrNavItems.forEach((objItem) => {
    const objSec = document.getElementById(objItem.strSecId);
    const objBtn = document.getElementById(objItem.strBtnId);
    if (!objSec || !objBtn) return;
    if (objItem.strSecId === strSectionId) {
      objSec.classList.remove("d-none");
      objBtn.classList.add("active");
      objBtn.setAttribute("aria-current", "page");
    } else {
      objSec.classList.add("d-none");
      objBtn.classList.remove("active");
      objBtn.removeAttribute("aria-current");
    }
  });

  // Collapse mobile nav if open
  const objNavCollapse = document.getElementById("navbarMain");
  if (objNavCollapse && objNavCollapse.classList.contains("show")) {
    const objToggler = document.querySelector(".navbar-toggler");
    if (objToggler) objToggler.click();
  }

  // Trigger section-specific load
  if (strSectionId === "secBuilder") loadBuilderSection();
}

// Wire up nav buttons
arrNavItems.forEach((objItem) => {
  const objBtn = document.getElementById(objItem.strBtnId);
  if (objBtn) {
    objBtn.addEventListener("click", () => navigateTo(objItem.strSecId));
  }
});

// Brand click goes to profile
document.getElementById("lnkBrand").addEventListener("click", (objEvt) => {
  objEvt.preventDefault();
  navigateTo("secProfile");
});

// ─── Generic API Helper ───────────────────────────────────────────────────────

async function apiFetch(strUrl, strMethod = "GET", objBody = null) {
  const objOptions = {
    method: strMethod,
    headers: { "Content-Type": "application/json" },
  };
  if (objBody) objOptions.body = JSON.stringify(objBody);
  const objResponse = await fetch(strUrl, objOptions);
  return objResponse.json();
}

// ─── AI Suggestion Helper ─────────────────────────────────────────────────────

async function getAiSuggestion(strText, strContext = "resume entry") {
  const objResult = await apiFetch("/api/ai/suggest", "POST", { strText, strContext });
  return objResult;
}

// ─── Format Month String ──────────────────────────────────────────────────────

function formatMonthDisplay(strDate) {
  if (!strDate) return "Present";
  const [strYear, strMonth] = strDate.split("-");
  const arrMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${arrMonths[parseInt(strMonth, 10) - 1]} ${strYear}`;
}

// ─── Library Attribution Popup ────────────────────────────────────────────────

function showLibraryCredits() {
  Swal.fire({
    title: "Library Attributions",
    html: `
      <div style="text-align:left;font-size:0.9rem">
        <p>ResumeForge is built with the following open-source libraries:</p>
        <ul>
          <li><strong>Bootstrap 5.3</strong> — MIT License — <a href="https://getbootstrap.com" target="_blank" rel="noopener">getbootstrap.com</a></li>
          <li><strong>Bootstrap Icons 1.11</strong> — MIT License — <a href="https://icons.getbootstrap.com" target="_blank" rel="noopener">icons.getbootstrap.com</a></li>
          <li><strong>SweetAlert2 11</strong> — MIT License — <a href="https://sweetalert2.github.io" target="_blank" rel="noopener">sweetalert2.github.io</a></li>
          <li><strong>html2pdf.js 0.10</strong> — MIT License — <a href="https://github.com/eKoopmans/html2pdf.js" target="_blank" rel="noopener">github.com/eKoopmans/html2pdf.js</a></li>
          <li><strong>Express 5</strong> — MIT License — <a href="https://expressjs.com" target="_blank" rel="noopener">expressjs.com</a></li>
          <li><strong>sqlite3</strong> — BSD-3-Clause — <a href="https://github.com/TryGhost/node-sqlite3" target="_blank" rel="noopener">github.com/TryGhost/node-sqlite3</a></li>
          <li><strong>dotenv</strong> — BSD-2-Clause — <a href="https://github.com/motdotla/dotenv" target="_blank" rel="noopener">github.com/motdotla/dotenv</a></li>
        </ul>
        <p class="mb-0" style="color:#8892b0;font-size:0.8rem">Thank you to all the open-source contributors who made this possible.</p>
      </div>
    `,
    icon: "info",
    confirmButtonText: "Close",
    width: 560,
  });
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function escapeHtml(strText) {
  if (!strText) return "";
  const objDiv = document.createElement("div");
  objDiv.appendChild(document.createTextNode(strText));
  return objDiv.innerHTML;
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  navigateTo("secProfile");
});
