const pages = [...document.querySelectorAll(".page")];
const navItems = [...document.querySelectorAll("[data-page-target]")];
const content = document.getElementById("appContent");
const installButton = document.getElementById("installButton");
const installRow = document.getElementById("installRow");
const installDialog = document.getElementById("installDialog");
const dialogInstallButton = document.getElementById("dialogInstallButton");
const installMessage = document.getElementById("installMessage");

let deferredInstallPrompt = null;

function showPage(pageName) {
  const validPage = pages.some(page => page.dataset.page === pageName)
    ? pageName
    : "dashboard";

  pages.forEach(page => {
    page.classList.toggle("active", page.dataset.page === validPage);
  });

  navItems.forEach(item => {
    item.classList.toggle("active", item.dataset.pageTarget === validPage);
  });

  history.replaceState({ page: validPage }, "", `#${validPage}`);
  content.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

navItems.forEach(item => {
  item.addEventListener("click", () => showPage(item.dataset.pageTarget));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

window.addEventListener("hashchange", () => {
  showPage(location.hash.replace("#", "") || "dashboard");
});

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
installRow.addEventListener("click", () => {
  if (deferredInstallPrompt) {
    promptInstall();
  } else {
    installDialog.showModal();
  }
});
dialogInstallButton.addEventListener("click", promptInstall);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.error("Service worker registration failed:", error);
    });
  });
}

showPage(location.hash.replace("#", "") || "dashboard");
