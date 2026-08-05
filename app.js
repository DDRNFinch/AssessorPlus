const STORAGE_KEY = "assessorPlusDepartment";
const CLASS_STORAGE_KEY = "assessorPlusClassesV08";
const SESSION_STORAGE_KEY = "assessorPlusActiveSessionV08";
const REGISTER_HISTORY_KEY = "assessorPlusRegisterHistoryV08";
const CONNECTION_STORAGE_KEY = "assessorPlusRegisterConnectionV08";
const pages = [...document.querySelectorAll(".page")];
const navItems = [...document.querySelectorAll("[data-page-target]")];
const content = document.getElementById("appContent");
const installButton = document.getElementById("installButton");
const installRow = document.getElementById("installRow");
const installDialog = document.getElementById("installDialog");
const dialogInstallButton = document.getElementById("dialogInstallButton");
const installMessage = document.getElementById("installMessage");
const departmentDialog = document.getElementById("departmentDialog");
const changeDepartment = document.getElementById("changeDepartment");
const closeDepartmentDialog = document.getElementById("closeDepartmentDialog");
const homeStatistics = document.getElementById("homeStatistics");
const dashboardAreas = document.getElementById("dashboardAreas");

const departmentConfig = {
  Tutor: {
    copy: "Teaching, classes and learner support",
    intro: "Your teaching activity, learner attendance and upcoming sessions at a glance.",
    stats: [
      ["Attendance", "—", "No attendance recorded yet"],
      ["My classes", "0", "Classes assigned to you"],
      ["Registers due", "0", "Registers awaiting completion"],
      ["Learners", "0", "Learners across your classes"]
    ],
    areas: [
      ["My Classes", "Create and manage teaching groups"],
      ["Registers", "Take attendance and review previous registers"],
      ["Learners", "View learners assigned to your classes"],
      ["Teaching Schedule", "See upcoming sessions and activity"]
    ]
  },
  Assessor: {
    copy: "Assessment, evidence and progress reviews",
    intro: "Your caseload attendance, progress and assessment activity at a glance.",
    stats: [
      ["Attendance", "—", "Average across your caseload"],
      ["Progress", "—", "Average learner progress"],
      ["Learners", "0", "Linked by unique learner ID"],
      ["Reviews due", "0", "Reviews requiring action"]
    ],
    areas: [
      ["Caseload", "Learners linked to your assessor account"],
      ["Attendance", "Attendance data linked by learner ID"],
      ["Progress", "Course and evidence progress by learner"],
      ["Reviews", "Plan, complete and record reviews"]
    ]
  },
  Employer: {
    copy: "Workplace progress and attendance",
    intro: "A summary of apprentices, attendance and workplace actions.",
    stats: [
      ["Apprentices", "0", "Linked to your organisation"],
      ["Attendance", "—", "Average apprentice attendance"],
      ["Reviews due", "0", "Employer input required"],
      ["Actions", "0", "Outstanding workplace actions"]
    ],
    areas: [
      ["My Apprentices", "View apprentices linked to your workplace"],
      ["Attendance", "Review attendance and absence information"],
      ["Progress", "See apprentice progress summaries"],
      ["Reviews", "Add employer comments and confirmations"]
    ]
  },
  Management: {
    copy: "Oversight, performance and reporting",
    intro: "Organisation-wide performance indicators and areas requiring attention.",
    stats: [
      ["Active learners", "0", "Across all departments"],
      ["Attendance", "—", "Organisation-wide average"],
      ["On track", "—", "Learners meeting progress expectations"],
      ["Alerts", "0", "Items requiring management action"]
    ],
    areas: [
      ["Performance", "Attendance, progress and completion KPIs"],
      ["Staff Overview", "Tutor and assessor caseload summaries"],
      ["Quality", "Reviews, compliance and quality actions"],
      ["Reports", "Organisation and department reporting"]
    ]
  },
  Administration: {
    copy: "Records, coordination and compliance",
    intro: "Learner records, identifiers and administrative actions at a glance.",
    stats: [
      ["Learners", "0", "Learner records created"],
      ["New this month", "0", "Recently added learners"],
      ["Missing details", "0", "Records requiring completion"],
      ["Departments", "0", "Active department workspaces"]
    ],
    areas: [
      ["Learner Records", "Add learners and generate unique learner IDs"],
      ["Staff Records", "Manage staff and department access"],
      ["Data Quality", "Find incomplete or duplicate records"],
      ["Exports", "Prepare administrative reports and data files"]
    ]
  },
  Other: {
    copy: "General education workspace",
    intro: "A flexible overview ready to be personalised around your work.",
    stats: [
      ["Learners", "0", "Learners linked to this workspace"],
      ["Attendance", "—", "No attendance data yet"],
      ["Tasks", "0", "Outstanding actions"],
      ["Alerts", "0", "Items requiring attention"]
    ],
    areas: [
      ["Learners", "People linked to this workspace"],
      ["Attendance", "Attendance summaries and records"],
      ["Tasks", "Upcoming and outstanding activity"],
      ["Reports", "Workspace information and exports"]
    ]
  }
};

let deferredInstallPrompt = null;
let selectedDepartment = localStorage.getItem(STORAGE_KEY) || "";

function showPage(pageName) {
  const validPage = pages.some(page => page.dataset.page === pageName) ? pageName : "home";
  pages.forEach(page => page.classList.toggle("active", page.dataset.page === validPage));
  navItems.forEach(item => item.classList.toggle("active", item.dataset.pageTarget === validPage));
  history.replaceState({ page: validPage }, "", `#${validPage}`);
  content.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderStatistics(config) {
  homeStatistics.innerHTML = config.stats.map(([label, value, note]) => `
    <article class="statistic-card">
      <span class="statistic-label">${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </article>
  `).join("");
}

function renderDashboardAreas(config) {
  dashboardAreas.innerHTML = config.areas.map(([title, description]) => {
    const registerArea = title === "Registers" || title === "Attendance";
    return `
      <button class="dashboard-area-card" type="button" data-area="${registerArea ? "registers" : "soon"}" ${registerArea ? "" : "disabled"}>
        <span><strong>${title}</strong><small>${description}</small></span>
        <span class="status-pill">${registerArea ? "Open" : "Soon"}</span>
      </button>`;
  }).join("");
}

dashboardAreas.addEventListener("click", event => {
  const button = event.target.closest("[data-area]");
  if (button?.dataset.area === "registers") showPage("registers");
});

function applyDepartment(department) {
  selectedDepartment = department;
  localStorage.setItem(STORAGE_KEY, department);
  const config = departmentConfig[department] || departmentConfig.Other;
  document.getElementById("roleSubtitle").textContent = `${department} workspace`;
  document.getElementById("dashboardGreeting").textContent = `${department} Home`;
  document.getElementById("dashboardIntro").textContent = config.intro;
  document.getElementById("homeStatisticsTitle").textContent = `${department} overview`;
  document.getElementById("homeStatisticsIntro").textContent = "Statistics from the main areas of your dashboard.";
  document.getElementById("homePanelTitle").textContent = `${department} activity`;
  document.getElementById("workspaceMessage").textContent = "These figures will update automatically as records, learners and activity are added to Assessor+.";
  document.getElementById("currentDepartmentText").textContent = `${department} workspace selected`;
  document.getElementById("dashboardNavLabel").textContent = "Dashboard";
  document.getElementById("departmentPageTitle").textContent = `${department} Dashboard`;
  document.getElementById("departmentHeading").textContent = `${department} Dashboard`;
  document.getElementById("departmentDescription").textContent = config.copy;
  renderStatistics(config);
  renderDashboardAreas(config);
  if (departmentDialog.open) departmentDialog.close();
}

function openDepartmentSelector(forceChoice = false) {
  closeDepartmentDialog.hidden = forceChoice;
  departmentDialog.showModal();
}

navItems.forEach(item => item.addEventListener("click", () => showPage(item.dataset.pageTarget)));
window.addEventListener("hashchange", () => showPage(location.hash.replace("#", "") || "home"));
document.querySelectorAll("[data-department]").forEach(button => button.addEventListener("click", () => applyDepartment(button.dataset.department)));
changeDepartment.addEventListener("click", () => openDepartmentSelector(false));

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
  dialogInstallButton.hidden = false;
  installMessage.textContent = "Assessor+ is ready to install on this device.";
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
  dialogInstallButton.hidden = true;
});
async function promptInstall() {
  if (!deferredInstallPrompt) {
    installMessage.innerHTML = "Open your browser menu and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.";
    dialogInstallButton.hidden = true;
    installDialog.showModal();
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
  dialogInstallButton.hidden = true;
}
installButton.addEventListener("click", promptInstall);
installRow.addEventListener("click", promptInstall);
dialogInstallButton.addEventListener("click", promptInstall);

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
if (selectedDepartment) applyDepartment(selectedDepartment);
else window.addEventListener("load", () => openDepartmentSelector(true), { once: true });
showPage(location.hash.replace("#", "") || "home");



// V0.9 learner ID and QR register workspace
const classDialog = document.getElementById("classDialog");
const classForm = document.getElementById("classForm");
const classSelect = document.getElementById("classSelect");
const registerEmpty = document.getElementById("registerEmpty");
const registerWorkspace = document.getElementById("registerWorkspace");
const learnerRegisterList = document.getElementById("learnerRegisterList");
const activeSessionPanel = document.getElementById("activeSessionPanel");
const registerSettingsDialog = document.getElementById("registerSettingsDialog");
let classes = JSON.parse(localStorage.getItem(CLASS_STORAGE_KEY) || "[]");
let activeSession = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
let registerHistory = JSON.parse(localStorage.getItem(REGISTER_HISTORY_KEY) || "[]");
let registerConnection = JSON.parse(localStorage.getItem(CONNECTION_STORAGE_KEY) || "{}");
let selectedClassId = classes[0]?.id || "";
let registerPollTimer = null;

const cleanId = value => String(value || "").replace(/\D/g, "").slice(0, 16);
const makeId = (length = 16) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => String(byte % 10)).join("");
};
const saveClasses = () => localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(classes));
const saveSession = () => {
  if (activeSession) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSession));
  else localStorage.removeItem(SESSION_STORAGE_KEY);
};
const currentClass = () => classes.find(item => item.id === selectedClassId) || classes[0] || null;

function allLearnerIds() {
  return new Set(classes.flatMap(group => group.learners || []).map(item => item.id));
}
function makeUniqueLearnerId(reserved = new Set()) {
  const existing = allLearnerIds();
  let id = "";
  do { id = makeId(16); } while (existing.has(id) || reserved.has(id));
  return id;
}
function parseLearners(text) {
  const seen = new Set();
  return String(text || "").split(/\n+/).map(line => {
    const parts = line.split(",");
    const name = String(parts.shift() || "").trim();
    let id = cleanId(parts.join(","));
    if (!name) return null;
    if (id.length !== 16 || seen.has(id)) id = makeUniqueLearnerId(seen);
    seen.add(id);
    return { name, id };
  }).filter(Boolean);
}

function updateRegisterHomeStats() {
  if (!selectedDepartment || !["Tutor", "Assessor"].includes(selectedDepartment)) return;
  const completed = registerHistory.length;
  const learners = classes.reduce((total, item) => total + item.learners.length, 0);
  const stats = [...homeStatistics.querySelectorAll(".statistic-card")];
  const registerCard = stats.find(card => card.querySelector(".statistic-label")?.textContent.includes("Registers"));
  const learnerCard = stats.find(card => card.querySelector(".statistic-label")?.textContent === "Learners");
  if (registerCard) registerCard.querySelector("strong").textContent = activeSession ? "1" : "0";
  if (learnerCard) learnerCard.querySelector("strong").textContent = learners;
  if (completed && stats[0]?.querySelector("strong")?.textContent === "—") {
    const all = registerHistory.flatMap(item => item.learners || []);
    const present = all.filter(item => ["Present", "Late"].includes(item.status)).length;
    stats[0].querySelector("strong").textContent = all.length ? `${Math.round(present / all.length * 100)}%` : "—";
  }
}

function renderClassSelect() {
  registerEmpty.hidden = classes.length > 0;
  registerWorkspace.hidden = classes.length === 0;
  if (!classes.length) return;
  if (!classes.some(item => item.id === selectedClassId)) selectedClassId = classes[0].id;
  classSelect.innerHTML = classes.map(item => `<option value="${item.id}" ${item.id === selectedClassId ? "selected" : ""}>${item.name}</option>`).join("");
  renderRegister();
  updateRegisterHomeStats();
}

function getSessionForClass() {
  return activeSession?.classId === selectedClassId ? activeSession : null;
}

function renderRegister() {
  const group = currentClass();
  if (!group) return;
  document.getElementById("sessionClassName").textContent = group.name;
  document.getElementById("sessionSummary").textContent = `${group.start}–${group.end} · late after ${group.lateMinutes} minutes · ${group.learners.length} learners`;
  const session = getSessionForClass();
  activeSessionPanel.hidden = !session;
  document.getElementById("startSessionButton").hidden = Boolean(session);
  if (session) {
    const started = new Date(session.startedAt);
    document.getElementById("activeSessionInfo").textContent = `${started.toLocaleDateString("en-GB")} · started ${started.toLocaleTimeString("en-GB", {hour:"2-digit", minute:"2-digit"})} · session ${session.id}`;
  }
  const records = session?.learners || group.learners.map(learner => ({...learner, status:"Unconfirmed", checkedAt:null, source:"—"}));
  learnerRegisterList.innerHTML = records.length ? records.map(record => `
    <article class="learner-row" data-learner-id="${record.id}">
      <div class="learner-name"><strong>${record.name}</strong><small>${record.id.replace(/(\d{4})(?=\d)/g, "$1 ")} · ${record.checkedAt ? new Date(record.checkedAt).toLocaleTimeString("en-GB", {hour:"2-digit",minute:"2-digit"}) : "not checked in"}${record.source && record.source !== "—" ? ` · ${record.source}` : ""}</small></div>
      <div class="status-controls">
        <button type="button" class="status-button share-id-button" data-share-learner-id="${record.id}">ID / QR</button>
        ${["Present","Late","Absent","Authorised"].map(status => `<button type="button" class="status-button ${record.status === status ? "active" : ""}" data-status="${status}" data-id="${record.id}">${status}</button>`).join("")}
      </div>
    </article>`).join("") : `<div class="basic-page"><p>No learners have been added to this class.</p></div>`;
  renderRegisterStats(records);
}

function renderRegisterStats(records) {
  const counts = {Present:0,Late:0,Absent:0,Unconfirmed:0,Authorised:0};
  records.forEach(item => counts[item.status] = (counts[item.status] || 0) + 1);
  document.getElementById("registerStats").innerHTML = [
    ["Present", counts.Present], ["Late", counts.Late], ["Absent", counts.Absent], ["Waiting", counts.Unconfirmed]
  ].map(([label,value]) => `<div class="register-stat"><strong>${value}</strong><small>${label}</small></div>`).join("");
}

function openClassDialog(edit = false) {
  const group = edit ? currentClass() : null;
  document.getElementById("classDialogTitle").textContent = group ? "Edit class" : "Create class";
  document.getElementById("classRecordId").value = group?.id || "";
  document.getElementById("classNameInput").value = group?.name || "";
  document.getElementById("classStartInput").value = group?.start || "09:00";
  document.getElementById("classEndInput").value = group?.end || "16:00";
  document.getElementById("lateMinutesInput").value = group?.lateMinutes ?? 5;
  document.getElementById("radiusInput").value = group?.radius ?? 150;
  document.getElementById("classLearnersInput").value = group?.learners.map(item => `${item.name}, ${item.id}`).join("\n") || "";
  classDialog.showModal();
}

classForm.addEventListener("submit", event => {
  event.preventDefault();
  const id = document.getElementById("classRecordId").value || makeId();
  const record = {
    id,
    name: document.getElementById("classNameInput").value.trim(),
    start: document.getElementById("classStartInput").value,
    end: document.getElementById("classEndInput").value,
    lateMinutes: Number(document.getElementById("lateMinutesInput").value || 5),
    radius: Number(document.getElementById("radiusInput").value || 150),
    learners: parseLearners(document.getElementById("classLearnersInput").value)
  };
  const index = classes.findIndex(item => item.id === id);
  if (index >= 0) classes[index] = record; else classes.push(record);
  selectedClassId = id;
  saveClasses();
  classDialog.close();
  renderClassSelect();
});

async function getCurrentLocation() {
  if (!navigator.geolocation) return null;
  return new Promise(resolve => navigator.geolocation.getCurrentPosition(
    position => resolve({latitude:position.coords.latitude, longitude:position.coords.longitude, accuracy:position.coords.accuracy}),
    () => resolve(null),
    {enableHighAccuracy:true, timeout:10000, maximumAge:60000}
  ));
}

async function startRegister() {
  const group = currentClass();
  if (!group) return;
  const location = await getCurrentLocation();
  activeSession = {
    id: makeId(12), classId:group.id, className:group.name, date:new Date().toISOString().slice(0,10),
    startedAt:new Date().toISOString(), location, radius:group.radius, lateMinutes:group.lateMinutes,
    learners:group.learners.map(item => ({...item,status:"Unconfirmed",checkedAt:null,source:"—"}))
  };
  saveSession();
  renderRegister();
  startPolling();
}

function setLearnerStatus(id, status, source = "Manual") {
  const record = activeSession?.learners.find(item => item.id === id);
  if (!record) return;
  record.status = status;
  if (["Present","Late"].includes(status) && !record.checkedAt) record.checkedAt = new Date().toISOString();
  record.source = source;
  saveSession();
  renderRegister();
}

function determineStatus(checkedAt) {
  const group = currentClass();
  if (!group) return "Present";
  const [hour, minute] = group.start.split(":").map(Number);
  const start = new Date(checkedAt); start.setHours(hour, minute + group.lateMinutes, 0, 0);
  return new Date(checkedAt) <= start ? "Present" : "Late";
}

function applyCheckin(payload) {
  if (!activeSession || payload.sessionId !== activeSession.id) return false;
  const id = cleanId(payload.learnerId);
  const record = activeSession.learners.find(item => item.id === id);
  if (!record) return false;
  const checkedAt = payload.checkedAt || new Date().toISOString();
  record.status = determineStatus(checkedAt);
  record.checkedAt = checkedAt;
  record.source = "Apprentice+";
  saveSession();
  renderRegister();
  return true;
}

async function fetchCheckins() {
  if (!activeSession || !registerConnection.endpoint) return;
  try {
    const url = new URL(registerConnection.endpoint.replace(/\/$/, "") + "/checkins");
    url.searchParams.set("sessionId", activeSession.id);
    const response = await fetch(url, {headers: registerConnection.key ? {"X-Organisation-Key":registerConnection.key} : {}});
    if (!response.ok) throw new Error("Connection failed");
    const data = await response.json();
    (Array.isArray(data) ? data : data.checkins || []).forEach(applyCheckin);
    document.getElementById("syncNote").textContent = `Connected · last checked ${new Date().toLocaleTimeString("en-GB", {hour:"2-digit",minute:"2-digit"})}`;
  } catch {
    document.getElementById("syncNote").textContent = "Unable to reach the attendance service. Manual register remains available.";
  }
}

function startPolling() {
  clearInterval(registerPollTimer);
  if (activeSession && registerConnection.endpoint) {
    fetchCheckins();
    registerPollTimer = setInterval(fetchCheckins, 10000);
  }
}

function finishRegister() {
  if (!activeSession) return;
  activeSession.learners.forEach(item => { if (item.status === "Unconfirmed") item.status = "Absent"; });
  activeSession.finishedAt = new Date().toISOString();
  registerHistory.unshift(activeSession);
  localStorage.setItem(REGISTER_HISTORY_KEY, JSON.stringify(registerHistory));
  activeSession = null;
  saveSession();
  clearInterval(registerPollTimer);
  renderRegister();
  updateRegisterHomeStats();
}

function exportRegisterCsv() {
  if (!activeSession) return;
  const rows = [["Learner","Learner ID","Status","Check-in time","Source"], ...activeSession.learners.map(item => [item.name,item.id,item.status,item.checkedAt || "",item.source || ""] )];
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${activeSession.className}-${activeSession.date}-register.csv`; link.click(); URL.revokeObjectURL(link.href);
}


function showLearnerId(record) {
  if (!record) return;
  const dialog = document.getElementById("learnerIdDialog");
  document.getElementById("learnerIdDialogName").textContent = record.name;
  document.getElementById("learnerIdDialogNumber").textContent = record.id.replace(/(\d{4})(?=\d)/g, "$1 ");
  const host = document.getElementById("learnerQrCode");
  host.replaceChildren();
  if (window.ApprenticeQR) host.appendChild(window.ApprenticeQR.toCanvas(record.id, 280));
  document.getElementById("copyLearnerIdButton").onclick = async () => {
    try { await navigator.clipboard.writeText(record.id); } catch {
      const area=document.createElement("textarea"); area.value=record.id; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
    }
    document.getElementById("copyLearnerIdButton").textContent = "Copied";
  };
  dialog.showModal();
}

learnerRegisterList.addEventListener("click", event => {
  const shareButton = event.target.closest("[data-share-learner-id]");
  if (shareButton) {
    const record=(activeSession?.learners || currentClass()?.learners || []).find(item=>item.id===shareButton.dataset.shareLearnerId);
    showLearnerId(record); return;
  }
  const button = event.target.closest("[data-status]");
  if (button) setLearnerStatus(button.dataset.id, button.dataset.status);
});
document.getElementById("newClassButton").addEventListener("click", () => openClassDialog(false));
document.getElementById("emptyNewClassButton").addEventListener("click", () => openClassDialog(false));
document.getElementById("editClassButton").addEventListener("click", () => openClassDialog(true));
classSelect.addEventListener("change", () => { selectedClassId = classSelect.value; renderRegister(); });
document.getElementById("startSessionButton").addEventListener("click", startRegister);
document.getElementById("endSessionButton").addEventListener("click", finishRegister);
document.getElementById("refreshCheckinsButton").addEventListener("click", fetchCheckins);
document.getElementById("copySessionButton").addEventListener("click", async () => { if (activeSession) await navigator.clipboard.writeText(activeSession.id); });
document.getElementById("exportRegisterButton").addEventListener("click", exportRegisterCsv);

const registerChannel = "BroadcastChannel" in window ? new BroadcastChannel("assessor-plus-register") : null;
registerChannel?.addEventListener("message", event => applyCheckin(event.data || {}));
window.addEventListener("storage", event => {
  if (event.key === "assessorPlusIncomingCheckin" && event.newValue) {
    try { applyCheckin(JSON.parse(event.newValue)); } catch {}
  }
});

document.getElementById("registerSettingsRow").addEventListener("click", () => {
  document.getElementById("attendanceEndpointInput").value = registerConnection.endpoint || "";
  document.getElementById("organisationKeyInput").value = registerConnection.key || "";
  registerSettingsDialog.showModal();
});
document.getElementById("registerSettingsForm").addEventListener("submit", event => {
  event.preventDefault();
  registerConnection = {endpoint:document.getElementById("attendanceEndpointInput").value.trim(), key:document.getElementById("organisationKeyInput").value};
  localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(registerConnection));
  document.getElementById("registerConnectionStatus").textContent = registerConnection.endpoint ? "Connected attendance service configured" : "Local mode — ready for Apprentice+ setup";
  registerSettingsDialog.close();
  startPolling();
});
document.getElementById("registerConnectionStatus").textContent = registerConnection.endpoint ? "Connected attendance service configured" : "Local mode — ready for Apprentice+ setup";
renderClassSelect();
startPolling();

// Future sync architecture placeholder
const syncArchitecture={
 mode:"offline-first",
 personIdLength:16,
 dailySummaryHour:0,
 autoSync:true,
 description:"Encrypted updates are queued locally and synchronised to authorised recipients whenever an internet connection is available. A nightly summary is generated after synchronisation."
};
