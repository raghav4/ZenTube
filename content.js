const SETTINGS_KEY = 'dfyt_settings';
const STATS_KEY = 'dfyt_stats';

const DEFAULTS = {
  enabled: true,
  hideNotificationBell: false,
  hideFeed: false,
  disableAutoplay: true,
  hideShortsVideos: false,
  hideShortsTab: false,
  hideSubscriptionsTab: false,
  showOnlyLibrary: false,
  hideRelatedVideos: true,
  hideSidebarRelated: true,
  hideSidebarLiveChat: false,
  hideSidebarPlaylists: false,
  hideMerch: false,
  hideComments: false,
  disablePlaylists: false,
  thumbnailStyle: 'none', // 'none' | 'grayscale' | 'blur'
  dailyLimit: 0,
};

const CLASS_MAP = {
  hideNotificationBell: 'dfyt-hide-notification-bell',
  hideFeed: 'dfyt-hide-feed',
  hideShortsVideos: 'dfyt-hide-shorts-videos',
  hideShortsTab: 'dfyt-hide-shorts-tab',
  hideSubscriptionsTab: 'dfyt-hide-subscriptions-tab',
  showOnlyLibrary: 'dfyt-show-only-library',
  hideRelatedVideos: 'dfyt-hide-related-videos',
  hideSidebarRelated: 'dfyt-hide-sidebar-related',
  hideSidebarLiveChat: 'dfyt-hide-sidebar-live-chat',
  hideSidebarPlaylists: 'dfyt-hide-sidebar-playlists',
  hideMerch: 'dfyt-hide-merch',
  hideComments: 'dfyt-hide-comments',
};

let settings = { ...DEFAULTS };

// ── Class application ──────────────────────────────────────────
// Uses document.documentElement — body is null at document_start.
// documentElement persists through YouTube's SPA navigation.
function applyClasses() {
  const el = document.documentElement;
  const active = settings.enabled !== false;
  for (const [key, cls] of Object.entries(CLASS_MAP)) {
    el.classList.toggle(cls, active && !!settings[key]);
  }
  const ts = active ? (settings.thumbnailStyle || 'none') : 'none';
  el.classList.toggle('dfyt-thumb-grayscale', ts === 'grayscale');
  el.classList.toggle('dfyt-thumb-blur', ts === 'blur');
}

// ── Focus time tracking ────────────────────────────────────────
let sessionStart = null;
let localTodayMs = 0; // synced from storage, updated locally each flush

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isTracking() {
  return settings.enabled !== false && !document.hidden;
}

function getTotalTodayMs() {
  const session = sessionStart !== null ? (Date.now() - sessionStart) : 0;
  return localTodayMs + session;
}

function flushTime(elapsed, force = false) {
  localTodayMs += elapsed;
  if (!force && elapsed < 2000) return;
  const today = todayKey();
  chrome.storage.local.get(STATS_KEY, (res) => {
    const s = res[STATS_KEY] || { totalMs: 0, todayMs: 0, todayDate: today };
    const todayMs = s.todayDate === today ? s.todayMs + elapsed : elapsed;
    chrome.storage.local.set({
      [STATS_KEY]: { totalMs: s.totalMs + elapsed, todayMs, todayDate: today },
    });
  });
}

function startSession() {
  if (sessionStart === null) sessionStart = Date.now();
}

function pauseSession() {
  if (sessionStart === null) return;
  const elapsed = Date.now() - sessionStart;
  sessionStart = null;
  flushTime(elapsed, true);
}

function loadTodayMs(cb) {
  chrome.storage.local.get(STATS_KEY, (res) => {
    const s = res[STATS_KEY] || {};
    const today = todayKey();
    localTodayMs = s.todayDate === today ? (s.todayMs || 0) : 0;
    if (cb) cb();
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseSession();
    stopTimerTick();
  } else {
    // Re-fetch from storage — tab may have been frozen while settings changed
    chrome.storage.sync.get(SETTINGS_KEY, (result) => {
      settings = { ...DEFAULTS, ...(result[SETTINGS_KEY] || {}) };
      applyClasses();
      if (isTracking()) {
        startSession();
        if (getLimitMs() && !timerTickId) startTimerTick();
      }
      if (settings.enabled !== false && settings.disableAutoplay) handleAutoplay();
      updateTimerDisplay();
    });
  }
});

window.addEventListener('pagehide', pauseSession);

setInterval(() => {
  if (sessionStart === null) return;
  const elapsed = Date.now() - sessionStart;
  sessionStart = Date.now();
  flushTime(elapsed);
}, 30000);

// ── Daily limit & timer ────────────────────────────────────────

let overlayDismissedDay = null;
let timerTickId = null;
let videoPlayBlocker = null;

function getLimitMs() {
  return (settings.dailyLimit || 0) * 60 * 1000;
}

function fmtCountdown(ms) {
  if (ms <= 0) return '0:00';
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtUsed(ms) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0) return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  return `${m}m`;
}

const INJECTED_CSS = `
#dfyt-timer{position:fixed;bottom:22px;right:22px;z-index:2147483646;background:rgba(0,0,0,.72);color:#fff;padding:6px 13px 6px 10px;border-radius:100px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:13px;font-weight:600;letter-spacing:-.2px;display:flex;align-items:center;gap:6px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 2px 16px rgba(0,0,0,.3);transition:background .4s;user-select:none;pointer-events:none}
#dfyt-timer.dfyt-warn{background:rgba(180,83,9,.88)}
#dfyt-timer.dfyt-crit{background:rgba(185,28,28,.92)}
#dfyt-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
#dfyt-ov-inner{display:flex;flex-direction:column;align-items:center;text-align:center;color:#fff;padding:48px 40px;max-width:380px}
#dfyt-ov-logo{margin-bottom:28px;opacity:.9}
#dfyt-ov-title{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:30px;font-weight:700;letter-spacing:-.7px;color:#fff;margin:0 0 4px}
#dfyt-ov-time{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:64px;font-weight:800;letter-spacing:-3px;color:#fff;line-height:1;margin:16px 0 4px}
#dfyt-ov-time-lbl{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:28px}
#dfyt-ov-sub{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:15px;color:rgba(255,255,255,.45);margin:0 0 32px;line-height:1.65}
#dfyt-ov-dismiss{background:transparent;color:rgba(220,80,80,.7);border:1px solid rgba(220,80,80,.25);border-radius:8px;padding:10px 22px;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-weight:500;cursor:pointer;transition:all .15s;pointer-events:all}
#dfyt-ov-dismiss:hover{color:rgba(220,80,80,1);border-color:rgba(220,80,80,.5);background:rgba(220,80,80,.08)}
`;

function ensureTimerUI() {
  if (document.getElementById('dfyt-timer')) return;
  if (!document.body) return;

  if (!document.getElementById('dfyt-styles')) {
    const style = document.createElement('style');
    style.id = 'dfyt-styles';
    style.textContent = INJECTED_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  const timer = document.createElement('div');
  timer.id = 'dfyt-timer';
  timer.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span id="dfyt-timer-txt"></span>`;
  document.body.appendChild(timer);

  const overlay = document.createElement('div');
  overlay.id = 'dfyt-overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div id="dfyt-ov-inner">
      <svg id="dfyt-ov-logo" width="54" height="54" viewBox="0 0 54 54" fill="none">
        <circle cx="27" cy="27" r="20" stroke="rgba(255,255,255,.85)" stroke-width="2.5"/>
        <circle cx="27" cy="27" r="13" stroke="rgba(255,255,255,.85)" stroke-width="2.5"/>
        <circle cx="27" cy="27" r="6"  stroke="rgba(255,255,255,.85)" stroke-width="2.5"/>
      </svg>
      <h2 id="dfyt-ov-title">Time's up.</h2>
      <div id="dfyt-ov-time"></div>
      <div id="dfyt-ov-time-lbl">watched today</div>
      <p id="dfyt-ov-sub">You've hit your daily YouTube limit.<br>Good job for setting one.</p>
      <button id="dfyt-ov-dismiss">Keep watching anyway :(</button>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('dfyt-ov-dismiss').addEventListener('click', () => {
    overlayDismissedDay = todayKey();
    document.getElementById('dfyt-overlay').style.display = 'none';
    unblockVideoPlay();
    document.querySelector('video')?.play();
    if (isTracking()) { startSession(); startTimerTick(); }
  });
}

function updateTimerDisplay() {
  const limitMs = getLimitMs();
  if (!limitMs || settings.enabled === false) {
    const t = document.getElementById('dfyt-timer');
    if (t) t.style.display = 'none';
    const overlay = document.getElementById('dfyt-overlay');
    if (overlay && overlay.style.display !== 'none') {
      overlay.style.display = 'none';
      unblockVideoPlay();
      document.querySelector('video')?.play();
      if (isTracking()) { startSession(); startTimerTick(); }
    }
    return;
  }
  if (!document.body) return;

  ensureTimerUI();
  const timer = document.getElementById('dfyt-timer');
  const txt   = document.getElementById('dfyt-timer-txt');
  if (!timer || !txt) return;

  const totalMs   = getTotalTodayMs();
  const remaining = limitMs - totalMs;

  timer.style.display = 'flex';
  timer.classList.toggle('dfyt-warn', remaining > 0 && remaining <= 5 * 60 * 1000);
  timer.classList.toggle('dfyt-crit', remaining <= 0);
  txt.textContent = remaining > 0 ? fmtCountdown(remaining) : 'Done';

  if (remaining <= 0 && overlayDismissedDay !== todayKey()) {
    const overlay = document.getElementById('dfyt-overlay');
    const timeEl  = document.getElementById('dfyt-ov-time');
    if (overlay && overlay.style.display !== 'flex') {
      overlay.style.display = 'flex';
      pauseSession();
      stopTimerTick();
      blockVideoPlay();
    }
    if (timeEl) timeEl.textContent = fmtUsed(totalMs);
  }
}

function blockVideoPlay() {
  if (videoPlayBlocker) return;
  const video = document.querySelector('video');
  if (!video) return;
  video.pause();
  videoPlayBlocker = () => video.pause();
  video.addEventListener('play', videoPlayBlocker);
}

function unblockVideoPlay() {
  if (!videoPlayBlocker) return;
  const video = document.querySelector('video');
  if (video) video.removeEventListener('play', videoPlayBlocker);
  videoPlayBlocker = null;
}

function startTimerTick() {
  if (timerTickId) return;
  timerTickId = setInterval(updateTimerDisplay, 1000);
}

function stopTimerTick() {
  if (!timerTickId) return;
  clearInterval(timerTickId);
  timerTickId = null;
}

// ── Autoplay ───────────────────────────────────────────────────
let autoplayObs = null;

function handleAutoplay() {
  if (autoplayObs) { autoplayObs.disconnect(); autoplayObs = null; }
  if (settings.enabled === false || !settings.disableAutoplay) return;

  const tryDisable = () => {
    const btn = document.querySelector('.ytp-autonav-toggle-button');
    if (btn) { if (btn.getAttribute('aria-checked') === 'true') btn.click(); return true; }
    return false;
  };

  if (!tryDisable()) {
    autoplayObs = new MutationObserver(() => {
      if (tryDisable()) { autoplayObs.disconnect(); autoplayObs = null; }
    });
    autoplayObs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { if (autoplayObs) { autoplayObs.disconnect(); autoplayObs = null; } }, 15000);
  }
}

// ── Playlist stripping ─────────────────────────────────────────
function handleDisablePlaylists() {
  if (settings.enabled === false || !settings.disablePlaylists) return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('list')) {
    url.searchParams.delete('list');
    url.searchParams.delete('index');
    history.replaceState(null, '', url.toString());
  }
}

// ── Navigation (YouTube SPA) ───────────────────────────────────
function onNavigate() {
  handleDisablePlaylists();
  applyClasses();
  if (settings.enabled !== false && settings.disableAutoplay) setTimeout(handleAutoplay, 800);
}

document.addEventListener('yt-navigate-finish', onNavigate);

// ── Init ───────────────────────────────────────────────────────
function init(s) {
  settings = { ...DEFAULTS, ...s };
  applyClasses();
  handleDisablePlaylists();

  loadTodayMs(() => {
    if (isTracking()) {
      startSession();
      if (getLimitMs()) startTimerTick();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        handleAutoplay();
        updateTimerDisplay();
      });
    } else {
      handleAutoplay();
      updateTimerDisplay();
    }
  });
}

chrome.storage.sync.get(SETTINGS_KEY, (result) => {
  init(result[SETTINGS_KEY] || {});
});

chrome.storage.onChanged.addListener((changes) => {
  if (!changes[SETTINGS_KEY]) return;
  const next = { ...DEFAULTS, ...(changes[SETTINGS_KEY].newValue || {}) };
  const wasEnabled = settings.enabled !== false;
  const nowEnabled = next.enabled !== false;
  settings = next;
  applyClasses();

  if (!wasEnabled && nowEnabled && !document.hidden) { startSession(); if (getLimitMs()) startTimerTick(); }
  if (wasEnabled && !nowEnabled) { pauseSession(); stopTimerTick(); }
  if (nowEnabled && getLimitMs() && !document.hidden && !timerTickId) startTimerTick();
  if (nowEnabled && !getLimitMs()) stopTimerTick();
  if (nowEnabled && settings.disableAutoplay) handleAutoplay();
  updateTimerDisplay();
});
