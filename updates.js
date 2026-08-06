(() => {
  const APP_VERSION = '5.2';
  const FALLBACK_RELEASE_NOTES = [
    'Fixed the update popup so it loads the release notes for the version waiting to be installed.',
    'Added a live release manifest so future updates show the correct version number and What’s new list.',
    'Removed stale V3.7/V3.9 update references from the PWA registration flow.',
    'Fixed the Missed Registers tab and restored overdue one-off register detection.',
    'Missed registers now include compatible registers created by older Assessor+ versions.',
    'Overdue active registers are finalised before the missed-register list is shown.'
  ];
  let registration = null;
  let waitingWorker = null;
  let refreshing = false;

  const setStatus = text => { const el = document.getElementById('updateStatus'); if (el) el.textContent = text; };
  const loadReleaseInfo = async () => {
    try {
      const response = await fetch(`./release.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Release metadata unavailable');
      const data = await response.json();
      return {
        version: String(data.version || APP_VERSION),
        notes: Array.isArray(data.notes) && data.notes.length ? data.notes.map(String) : FALLBACK_RELEASE_NOTES
      };
    } catch {
      return { version: APP_VERSION, notes: FALLBACK_RELEASE_NOTES };
    }
  };
  const showUpdate = async worker => {
    waitingWorker = worker;
    const release = await loadReleaseInfo();
    const versionText = document.getElementById('updateVersionText');
    if (versionText) versionText.textContent = `Assessor+ V${release.version} is ready to install.`;
    const notes = document.getElementById('updateNotes');
    if (notes) notes.innerHTML = release.notes.map(note => `<li>${esc(note)}</li>`).join('');
    document.getElementById('updateModal')?.classList.add('open');
    setStatus(`V${release.version} available`);
  };
  const inspectRegistration = reg => {
    registration = reg;
    if (reg.waiting) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      setStatus('Downloading update…');
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') {
          if (navigator.serviceWorker.controller) showUpdate(worker);
          else setStatus(`V${APP_VERSION} installed`);
        }
      });
    });
  };

  document.getElementById('checkUpdateBtn')?.addEventListener('click', async () => {
    if (!registration) return setStatus('Updates are unavailable in this browser');
    setStatus('Checking for updates…');
    try {
      await registration.update();
      if (registration.waiting) await showUpdate(registration.waiting);
      else setTimeout(() => { if (!waitingWorker) setStatus('Assessor+ is up to date'); }, 700);
    } catch { setStatus('Could not check for updates'); }
  });
  document.getElementById('updateLaterBtn')?.addEventListener('click', () => {
    document.getElementById('updateModal')?.classList.remove('open');
    setStatus('Update available');
  });
  document.getElementById('updateNowBtn')?.addEventListener('click', () => {
    const button = document.getElementById('updateNowBtn');
    if (button) { button.disabled = true; button.textContent = 'Installing…'; }
    setStatus('Installing update…');
    (waitingWorker || registration?.waiting)?.postMessage({ type: 'SKIP_WAITING' });
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js?v=5.2', { updateViaCache: 'none' });
        inspectRegistration(reg);
        setStatus(`V${APP_VERSION} installed`);
        await reg.update().catch(() => {});
      } catch {
        setStatus('Updates are unavailable in this browser');
      }
    });
  } else {
    setStatus('Updates are unavailable in this browser');
  }
})();
