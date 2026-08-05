<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#6d28d9">
  <meta name="description" content="Assessor+ — registers, learners, classes and assessor tools.">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Assessor+">
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="apple-touch-icon" href="./icons/icon-192.png">
  <link rel="icon" href="./icons/icon-192.png">
  <link rel="stylesheet" href="./css/main.css">
  <title>Assessor+</title>
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">A+</div>
        <div>
          <h1>Assessor+</h1>
          <p>Teaching and assessment workspace</p>
        </div>
      </div>
      <button id="installButton" class="icon-button" type="button" aria-label="Install Assessor+" hidden>Install</button>
    </header>

    <main id="appContent" class="content" tabindex="-1">
      <section class="page active" data-page="dashboard">
        <div class="welcome-card">
          <p class="eyebrow">ASSessor+ V0.1</p>
          <h2>Welcome to Assessor+</h2>
          <p>This is the blank foundation app. Each area is ready for us to build into as the project develops.</p>
        </div>

        <div class="section-heading">
          <h3>Quick actions</h3>
        </div>

        <div class="card-grid">
          <button class="feature-card" data-go="classes">
            <span class="feature-icon">C</span>
            <strong>Classes</strong>
            <small>Create and manage class templates</small>
          </button>
          <button class="feature-card" data-go="learners">
            <span class="feature-icon">L</span>
            <strong>Learners</strong>
            <small>Add learners and create linking IDs</small>
          </button>
          <button class="feature-card" data-go="registers">
            <span class="feature-icon">R</span>
            <strong>Registers</strong>
            <small>Start and review attendance sessions</small>
          </button>
          <button class="feature-card" data-go="tools">
            <span class="feature-icon">T</span>
            <strong>Tools</strong>
            <small>Settings, exports and support</small>
          </button>
        </div>
      </section>

      <section class="page" data-page="classes">
        <div class="page-title">
          <div>
            <p class="eyebrow">CLASS MANAGEMENT</p>
            <h2>Classes</h2>
          </div>
          <button class="primary-button" disabled>+ New class</button>
        </div>
        <div class="placeholder-panel">
          <div class="placeholder-icon">C</div>
          <h3>Class templates will appear here</h3>
          <p>This section will hold class names, timetables, scheduled breaks and assigned learners.</p>
          <span class="status-pill">Placeholder</span>
        </div>
      </section>

      <section class="page" data-page="learners">
        <div class="page-title">
          <div>
            <p class="eyebrow">LEARNER MANAGEMENT</p>
            <h2>Learners</h2>
          </div>
          <button class="primary-button" disabled>+ New learner</button>
        </div>
        <div class="placeholder-panel">
          <div class="placeholder-icon">L</div>
          <h3>Learner profiles will appear here</h3>
          <p>This section will generate unique 10-digit learner IDs, QR codes and attendance histories.</p>
          <span class="status-pill">Placeholder</span>
        </div>
      </section>

      <section class="page" data-page="registers">
        <div class="page-title">
          <div>
            <p class="eyebrow">ATTENDANCE</p>
            <h2>Registers</h2>
          </div>
          <button class="primary-button" disabled>Start session</button>
        </div>
        <div class="placeholder-panel">
          <div class="placeholder-icon">R</div>
          <h3>Live registers will appear here</h3>
          <p>This area will contain session QR codes, live attendance timers, breaks, individual stop controls and finalisation.</p>
          <span class="status-pill">Placeholder</span>
        </div>
      </section>

      <section class="page" data-page="tools">
        <div class="page-title">
          <div>
            <p class="eyebrow">APP MANAGEMENT</p>
            <h2>Tools</h2>
          </div>
        </div>
        <div class="list-card">
          <button type="button" class="list-row" id="installRow">
            <span>
              <strong>Install Assessor+</strong>
              <small>Add the app to this device</small>
            </span>
            <span aria-hidden="true">›</span>
          </button>
          <button type="button" class="list-row" disabled>
            <span>
              <strong>Tutor profile</strong>
              <small>Name, college and department</small>
            </span>
            <span class="status-pill">Soon</span>
          </button>
          <button type="button" class="list-row" disabled>
            <span>
              <strong>Backup and export</strong>
              <small>App data, PDF and CSV exports</small>
            </span>
            <span class="status-pill">Soon</span>
          </button>
          <button type="button" class="list-row" disabled>
            <span>
              <strong>Diagnostics</strong>
              <small>Version, storage and error information</small>
            </span>
            <span class="status-pill">Soon</span>
          </button>
        </div>
      </section>
    </main>

    <nav class="bottom-nav" aria-label="Main navigation">
      <button class="nav-item active" data-page-target="dashboard">
        <span>⌂</span><small>Home</small>
      </button>
      <button class="nav-item" data-page-target="classes">
        <span>▦</span><small>Classes</small>
      </button>
      <button class="nav-item" data-page-target="learners">
        <span>●</span><small>Learners</small>
      </button>
      <button class="nav-item" data-page-target="registers">
        <span>✓</span><small>Registers</small>
      </button>
      <button class="nav-item" data-page-target="tools">
        <span>⚙</span><small>Tools</small>
      </button>
    </nav>
  </div>

  <dialog id="installDialog">
    <form method="dialog" class="dialog-card">
      <h2>Install Assessor+</h2>
      <p id="installMessage">Use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
      <div class="dialog-actions">
        <button value="cancel" class="secondary-button">Close</button>
        <button id="dialogInstallButton" value="default" class="primary-button" type="button" hidden>Install</button>
      </div>
    </form>
  </dialog>

  <script type="module" src="./js/app.js"></script>
</body>
</html>
