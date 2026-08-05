const STORAGE_KEY = "assessorPlusDepartment";
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
  dashboardAreas.innerHTML = config.areas.map(([title, description]) => `
    <button class="dashboard-area-card" type="button" disabled>
      <span><strong>${title}</strong><small>${description}</small></span>
      <span class="status-pill">Soon</span>
    </button>
  `).join("");
}

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


// Future sync architecture placeholder
const syncArchitecture={
 mode:"offline-first",
 personIdLength:16,
 dailySummaryHour:0,
 autoSync:true,
 description:"Encrypted updates are queued locally and synchronised to authorised recipients whenever an internet connection is available. A nightly summary is generated after synchronisation."
};
