const SETTINGS_KEY = 'dfyt_settings';
const RATING_KEY = 'dfyt_rating';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const INSTALL_DELAY_DAYS = 7;
const MIN_ACTIVE_DAYS = 5;
const COOLDOWN_DAYS = 30;

const REVIEW_URL = 'https://chromewebstore.google.com/detail/zentube/ljnjkcelmlkcdcghffobikpjlefjaldh/reviews';
const HOST_ID = 'dfyt-rating-host';

let settings = { enabled: true };
let state = {};
let host = null;
let themeObs = null;

// ── Storage helpers ────────────────────────────────────────────

function loadRating(callback) {
  chrome.storage.local.get(RATING_KEY, (res) => {
    state = res[RATING_KEY] || {};
    if (callback) callback(state);
  });
}

function saveRating(next) {
  state = next;
  chrome.storage.local.set({ [RATING_KEY]: next });
}

function loadSettings(callback) {
  chrome.storage.sync.get(SETTINGS_KEY, (res) => {
    settings = { enabled: true, ...(res[SETTINGS_KEY] || {}) };
    if (callback) callback(settings);
  });
}

// ── Eligibility ──────────────────────────────────────────────────

function todayKey() {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

function isEligiblePage() {
  const path = window.location.pathname;
  return path === '/' || path === '/watch';
}

function recordActiveDay() {
  if (!isEligiblePage()) return;
  const today = todayKey();
  const days = new Set(state.activeDays || []);
  if (days.has(today)) return;
  days.add(today);
  saveRating({ ...state, activeDays: Array.from(days).sort() });
}

function isEligible(s) {
  if (!s || s.completed || s.dismissed) return false;
  if (!s.installedAt) return false;
  const now = Date.now();
  if (now - s.installedAt < INSTALL_DELAY_DAYS * MS_PER_DAY) return false;
  const activeDays = new Set(s.activeDays || []).size;
  if (activeDays < MIN_ACTIVE_DAYS) return false;
  if (!s.lastShownAt) return true;
  return now - s.lastShownAt >= COOLDOWN_DAYS * MS_PER_DAY;
}

// ── Theme detection ────────────────────────────────────────────

function detectYouTubeTheme() {
  const html = document.documentElement;
  if (html.getAttribute('dark') === 'true') return 'dark';
  const body = document.body;
  if (body && body.getAttribute('dark') === 'true') return 'dark';
  const app = document.querySelector('ytd-app');
  if (app && app.getAttribute('dark') === 'true') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToHost() {
  if (!host) return;
  host.dataset.theme = detectYouTubeTheme();
}

function startThemeObserver() {
  if (themeObs) return;
  themeObs = new MutationObserver(applyThemeToHost);
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });
}

function stopThemeObserver() {
  if (!themeObs) return;
  themeObs.disconnect();
  themeObs = null;
}

function adjustPosition() {
  const timer = document.getElementById('dfyt-timer');
  if (timer && window.getComputedStyle(timer).display !== 'none') {
    host.style.bottom = '64px';
  }
}

// ── Card rendering ───────────────────────────────────────────────

const CARD_CSS = `
:host {
  position: fixed;
  bottom: 22px;
  right: 22px;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.4;
  --dfyt-r-bg: rgba(255,255,255,.72);
  --dfyt-r-text: #111827;
  --dfyt-r-text-2: #374151;
  --dfyt-r-muted: #6b7280;
  --dfyt-r-border: rgba(0,0,0,.08);
  --dfyt-r-primary-bg: #18181b;
  --dfyt-r-primary-text: #fff;
  --dfyt-r-secondary-hover: rgba(0,0,0,.06);
  --dfyt-r-backdrop: blur(20px) saturate(160%);
}

:host([data-theme="dark"]) {
  --dfyt-r-bg: rgba(30,30,33,.72);
  --dfyt-r-text: #f4f4f5;
  --dfyt-r-text-2: #d4d4d8;
  --dfyt-r-muted: #a1a1aa;
  --dfyt-r-border: rgba(255,255,255,.10);
  --dfyt-r-primary-bg: #f4f4f5;
  --dfyt-r-primary-text: #18181b;
  --dfyt-r-secondary-hover: rgba(255,255,255,.08);
}

.card {
  width: 320px;
  max-width: calc(100vw - 40px);
  background: var(--dfyt-r-bg);
  color: var(--dfyt-r-text);
  border: 1px solid var(--dfyt-r-border);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,.08);
  backdrop-filter: var(--dfyt-r-backdrop);
  -webkit-backdrop-filter: var(--dfyt-r-backdrop);
  animation: dfyt-r-enter .35s ease-out;
  position: relative;
}

@media (max-width: 480px) {
  :host { right: 16px; bottom: 16px; }
  .card { width: calc(100vw - 32px); }
}

@keyframes dfyt-r-enter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--dfyt-r-muted);
  cursor: pointer;
  border-radius: 6px;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  transition: background .12s, color .12s;
}

.close:hover {
  background: var(--dfyt-r-secondary-hover);
  color: var(--dfyt-r-text);
  backdrop-filter: var(--dfyt-r-backdrop);
  -webkit-backdrop-filter: var(--dfyt-r-backdrop);
}

.content { padding-right: 10px; }

.heading {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.2px;
  color: var(--dfyt-r-text);
}

.message {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--dfyt-r-text-2);
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--dfyt-r-border);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background .12s, border-color .12s, transform .12s;
}

.btn:hover { transform: translateY(-1px); }

.btn-primary,
a.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  background: var(--dfyt-r-primary-bg);
  color: var(--dfyt-r-primary-text);
  border-color: var(--dfyt-r-primary-bg);
}

.btn-secondary {
  background: rgba(255,255,255,.35);
  color: var(--dfyt-r-text-2);
  border-color: var(--dfyt-r-border);
}

.btn-secondary:hover {
  background: var(--dfyt-r-secondary-hover);
}

:host([data-theme="dark"]) .btn-secondary {
  background: rgba(255,255,255,.12);
}
`;

function removeCard() {
  stopThemeObserver();
  if (host && host.parentNode) {
    host.parentNode.removeChild(host);
  }
  host = null;
}

function onRate(e) {
  // Let the anchor open the Chrome Web Store review page in a new tab,
  // mark the request as completed so it never appears again, then tidy up.
  saveRating({ ...state, completed: true, lastShownAt: Date.now() });
  setTimeout(removeCard, 0);
}

function onMaybeLater() {
  saveRating({ ...state, lastShownAt: Date.now() });
  removeCard();
}

function onDismiss() {
  saveRating({ ...state, dismissed: true });
  removeCard();
}

function renderCard() {
  if (document.getElementById(HOST_ID)) return;
  if (!document.body) return;

  host = document.createElement('div');
  host.id = HOST_ID;
  applyThemeToHost();

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CARD_CSS;
  shadow.appendChild(style);

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Rating request');
  card.innerHTML = `
    <button class="close" aria-label="Close rating request">×</button>
    <div class="content">
      <h3 class="heading">A little love for Zentube?</h3>
      <p class="message">If Zentube has made your YouTube experience a little better, would you take a moment to leave a rating? It really makes our day better.</p>
      <div class="actions">
        <a class="btn btn-primary" id="dfyt-rate-btn" href="${REVIEW_URL}" target="_blank" rel="noopener noreferrer">Rate Zentube</a>
        <button class="btn btn-secondary" id="dfyt-later-btn">Maybe later</button>
      </div>
    </div>
  `;
  shadow.appendChild(card);

  card.querySelector('.close').addEventListener('click', onDismiss);
  card.querySelector('#dfyt-rate-btn').addEventListener('click', onRate);
  card.querySelector('#dfyt-later-btn').addEventListener('click', onMaybeLater);

  document.body.appendChild(host);
  adjustPosition();
  startThemeObserver();
}

// ── Evaluation ─────────────────────────────────────────────────

function maybeShow() {
  if (settings.enabled === false) {
    removeCard();
    return;
  }
  recordActiveDay();
  if (document.getElementById(HOST_ID)) return;
  if (!isEligiblePage()) return;
  if (!isEligible(state)) return;
  if (!document.body) {
    waitForBodyThenShow();
    return;
  }
  renderCard();
  saveRating({ ...state, lastShownAt: Date.now() });
}

let bodyWaitObs = null;
function waitForBodyThenShow() {
  if (bodyWaitObs) return;
  bodyWaitObs = new MutationObserver(() => {
    if (document.body) {
      bodyWaitObs.disconnect();
      bodyWaitObs = null;
      maybeShow();
    }
  });
  bodyWaitObs.observe(document.documentElement, { childList: true, subtree: true });
}

function onNavigate() {
  maybeShow();
}

function onStorageChanged(changes, area) {
  if (area === 'sync' && changes[SETTINGS_KEY]) {
    settings = { enabled: true, ...(changes[SETTINGS_KEY].newValue || {}) };
    maybeShow();
  }
  if (area === 'local' && changes[RATING_KEY]) {
    state = changes[RATING_KEY].newValue || {};
    if (state.completed || state.dismissed) removeCard();
  }
}

// ── Init ─────────────────────────────────────────────────────────

function init() {
  loadSettings(() => {
    loadRating(() => {
      maybeShow();
      document.addEventListener('yt-navigate-finish', onNavigate);
      chrome.storage.onChanged.addListener(onStorageChanged);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
