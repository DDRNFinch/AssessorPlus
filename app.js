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

const roleCopy = {
  Tutor: "Teaching, classes and learner support",
  Assessor: "Assessment, evidence and progress reviews",
  Employer: "Workplace progress and attendance",
  Management: "Oversight, performance and reporting",
  Administration: "Records, coordination and compliance",
  Other: "General education workspace"
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

function applyDepartment(department) {
  selectedDepartment = department;
  localStorage.setItem(STORAGE_KEY, department);
  document.getElementById("roleSubtitle").textContent = `${department} workspace`;
  document.getElementById("dashboardGreeting").textContent = `Welcome to ${department} Assessor+`;
  document.getElementById("dashboardIntro").textContent = roleCopy[department] || roleCopy.Other;
  document.getElementById("departmentName").textContent = department;
  document.getElementById("currentDepartmentText").textContent = `${department} workspace selected`;
  document.getElementById("workspaceMessage").textContent = `Future ${department.toLowerCase()} tools, information and shortcuts will appear on this dashboard.`;
  document.getElementById("pathwayNavLabel").textContent = "Dashboard";
  document.getElementById("pathwayPageTitle").textContent = `${department} Dashboard`;
  document.getElementById("pathwayHeading").textContent = `${department} Dashboard`;
  document.getElementById("pathwayDescription").textContent = `${roleCopy[department] || roleCopy.Other}. Your dedicated dashboard tools and features will be added here.`;
  departmentDialog.close();
}

function openDepartmentSelector(forceChoice = false) {
  closeDepartmentDialog.hidden = forceChoice;
  departmentDialog.showModal();
}

navItems.forEach(item => item.addEventListener("click", () => showPage(item.dataset.pageTarget)));
window.addEventListener("hashchange", () => showPage(location.hash.replace("#", "") || "home"));

document.querySelectorAll("[data-department]").forEach(button => {
  button.addEventListener("click", () => applyDepartment(button.dataset.department));
});
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
}

if (selectedDepartment) {
  applyDepartment(selectedDepartment);
} else {
  window.addEventListener("load", () => openDepartmentSelector(true), { once: true });
}

showPage(location.hash.replace("#", "") || "home");
