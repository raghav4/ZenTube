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
  disableHoverPreview: false,
  thumbnailStyle: 'none', // 'none' | 'grayscale' | 'blur'
  dailyLimit: 0,
  theme: 'auto', // popup appearance: 'auto' | 'light' | 'dark'
};

const SECTIONS = {
  navigation: ['hideNotificationBell', 'hideShortsTab', 'hideSubscriptionsTab', 'showOnlyLibrary'],
  homepage: ['hideFeed', 'hideShortsVideos', 'disableHoverPreview'],
  watching: ['disableAutoplay', 'hideRelatedVideos', 'hideSidebarRelated', 'hideSidebarLiveChat',
             'hideSidebarPlaylists', 'hideMerch', 'hideComments', 'disablePlaylists'],
};

// enabled/dailyLimit/thumbnailStyle/theme are excluded — they're not CSS-class checkboxes
const NON_TOGGLE = new Set(['enabled', 'dailyLimit', 'thumbnailStyle', 'theme']);
const FEATURE_KEYS = Object.keys(DEFAULTS).filter(k => !NON_TOGGLE.has(k));

// ── Theme ─────────────────────────────────────────────────────
const darkMql = window.matchMedia('(prefers-color-scheme: dark)');
let currentTheme = 'auto';

function applyTheme(theme) {
  currentTheme = theme || 'auto';
  const resolved = currentTheme === 'auto'
    ? (darkMql.matches ? 'dark' : 'light')
    : currentTheme;
  document.documentElement.dataset.theme = resolved;
}

// Re-resolve when the OS theme changes and we're following it.
darkMql.addEventListener('change', () => { if (currentTheme === 'auto') applyTheme('auto'); });

const PRESET_MINS = [0, 15, 30, 60];

const PRESETS = {
  light: {
    disableAutoplay: true, hideSidebarRelated: true,
    hideRelatedVideos: false, hideNotificationBell: false, hideFeed: false,
    hideShortsVideos: false, hideShortsTab: false, hideSubscriptionsTab: false,
    showOnlyLibrary: false, hideSidebarLiveChat: false, hideSidebarPlaylists: false,
    hideMerch: false, hideComments: false, disablePlaylists: false,
    disableHoverPreview: false,
  },
  balanced: {
    disableAutoplay: true, hideSidebarRelated: true, hideRelatedVideos: true,
    hideNotificationBell: true, hideShortsTab: true, hideMerch: true,
    hideFeed: false, hideShortsVideos: false, hideSubscriptionsTab: false,
    showOnlyLibrary: false, hideSidebarLiveChat: false, hideSidebarPlaylists: false,
    hideComments: false, disablePlaylists: false, disableHoverPreview: false,
  },
  zen: {
    disableAutoplay: true, hideNotificationBell: true, hideFeed: true,
    hideShortsVideos: true, hideShortsTab: true, hideSubscriptionsTab: true,
    hideRelatedVideos: true, hideSidebarRelated: true, hideSidebarLiveChat: true,
    hideSidebarPlaylists: true, hideMerch: true, hideComments: true,
    disableHoverPreview: true,
    showOnlyLibrary: false, disablePlaylists: false,
  },
};

// ── Helpers ───────────────────────────────────────────────────

function readLimit() {
  const custom = document.getElementById('customLimitInput');
  const activePill = document.querySelector('.lpill.active');
  if (activePill) return parseInt(activePill.dataset.min, 10) || 0;
  if (custom?.value) return Math.max(1, Math.min(480, parseInt(custom.value, 10) || 0));
  return 0;
}

function readThumb() {
  const active = document.querySelector('.tpill.active');
  return active ? (active.dataset.thumb || 'none') : 'none';
}

function readTheme() {
  const active = document.querySelector('.thpill.active');
  return active ? (active.dataset.themeOpt || 'auto') : 'auto';
}

function getValues() {
  const s = {
    enabled: document.getElementById('enabled').checked,
    dailyLimit: readLimit(),
    thumbnailStyle: readThumb(),
    theme: readTheme(),
  };
  for (const key of FEATURE_KEYS) {
    const el = document.getElementById(key);
    s[key] = el ? el.checked : DEFAULTS[key];
  }
  return s;
}

function detectPreset(s) {
  for (const [name, preset] of Object.entries(PRESETS)) {
    if (FEATURE_KEYS.every(k => !!preset[k] === !!s[k])) return name;
  }
  return null;
}

function fmtMs(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return null;
  const h = Math.floor(m / 60), rem = m % 60;
  if (h === 0) return `${m} min`;
  return rem === 0 ? `${h} hr` : `${h} hr ${rem} min`;
}

function showSaved() {
  const el = document.getElementById('savedMsg');
  const note = document.getElementById('privacyNote');
  el.classList.add('show');
  if (note) note.style.opacity = '0';
  setTimeout(() => {
    el.classList.remove('show');
    if (note) note.style.opacity = '1';
  }, 1600);
}

function setExtensionIcon(enabled) {
  const sfx = enabled ? '-on' : '';
  chrome.action.setIcon({
    path: { 16: `icons/icon16${sfx}.png`, 48: `icons/icon48${sfx}.png`, 128: `icons/icon128${sfx}.png` },
  });
  const img = document.getElementById('logoImg');
  if (img) img.src = `icons/icon48${sfx}.png`;
}

// ── Render ────────────────────────────────────────────────────

function renderUI(s) {
  const on = s.enabled !== false;
  document.getElementById('enabled').checked = on;
  document.getElementById('masterLbl').textContent = on ? 'On' : 'Off';
  document.getElementById('masterLbl').classList.toggle('on', on);
  document.getElementById('settingsArea').classList.toggle('dim', !on);
  setExtensionIcon(on);

  for (const key of FEATURE_KEYS) {
    const el = document.getElementById(key);
    if (el) el.checked = !!s[key];
  }

  const count = FEATURE_KEYS.filter(k => s[k]).length;
  document.getElementById('brandSub').textContent = on
    ? (count === 0 ? 'No features active' : `${count} feature${count !== 1 ? 's' : ''} active`)
    : 'Paused';

  const activePreset = detectPreset(s);
  document.querySelectorAll('.preset').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === activePreset);
  });

  for (const [section, keys] of Object.entries(SECTIONS)) {
    const allOn = keys.every(k => s[k]);
    const el = document.getElementById(`action-${section}`);
    if (el) el.textContent = allOn ? 'Disable all' : 'Enable all';
  }

  // Daily limit pills
  const limit = s.dailyLimit || 0;
  document.querySelectorAll('.lpill').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.min, 10) === limit);
  });
  const customEl = document.getElementById('customLimitInput');
  if (customEl) {
    const hasCustom = limit > 0 && !PRESET_MINS.includes(limit);
    customEl.value = hasCustom ? limit : '';
    customEl.classList.toggle('has-value', hasCustom);
  }

  // Thumbnail style pills
  const thumb = s.thumbnailStyle || 'none';
  document.querySelectorAll('.tpill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.thumb === thumb);
  });

  // Theme pills + apply
  const theme = s.theme || 'auto';
  document.querySelectorAll('.thpill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeOpt === theme);
  });
  applyTheme(theme);
}

function save() {
  const s = getValues();
  chrome.storage.sync.set({ [SETTINGS_KEY]: s }, showSaved);
  renderUI(s);
}

// ── Stats ─────────────────────────────────────────────────────

function loadStats() {
  chrome.storage.local.get(STATS_KEY, (res) => {
    const s = res[STATS_KEY] || {};
    const today = new Date().toISOString().slice(0, 10);
    const totalMs = s.totalMs || 0;
    const todayMs = s.todayDate === today ? (s.todayMs || 0) : 0;
    const totalFmt = fmtMs(totalMs);
    if (!totalFmt) return;
    document.getElementById('statBar').classList.remove('hidden');
    const todayFmt = fmtMs(todayMs);
    document.getElementById('statText').innerHTML = (todayFmt && todayMs > 0)
      ? `<b>${todayFmt}</b> focused today &nbsp;·&nbsp; ${totalFmt} total`
      : `<b>${totalFmt}</b> focused on YouTube`;
  });
}

// ── Keyboard shortcut hint ────────────────────────────────────

function renderShortcut() {
  const hint = document.getElementById('shortcutHint');
  const keys = document.getElementById('shortcutKeys');
  if (!hint || !keys || !chrome.commands?.getAll) { if (hint) hint.style.display = 'none'; return; }
  chrome.commands.getAll((cmds) => {
    const cmd = cmds.find(c => c.name === 'toggle-enabled');
    keys.textContent = cmd && cmd.shortcut ? cmd.shortcut : 'Not set';
  });
}

// ── Boot ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderShortcut();
  document.getElementById('shortcutChange')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  chrome.storage.sync.get(SETTINGS_KEY, (result) => {
    renderUI({ ...DEFAULTS, ...(result[SETTINGS_KEY] || {}) });
  });

  loadStats();
  setInterval(loadStats, 10000);

  // Master toggle
  document.getElementById('enabled').addEventListener('change', save);

  // Feature switches
  for (const key of FEATURE_KEYS) {
    document.getElementById(key)?.addEventListener('change', save);
  }

  // Preset buttons
  document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS[btn.dataset.preset];
      if (!preset) return;
      for (const key of FEATURE_KEYS) {
        const el = document.getElementById(key);
        if (el) el.checked = !!preset[key];
      }
      save();
    });
  });

  // Section header → toggle all
  document.querySelectorAll('.card-hd').forEach(hd => {
    hd.addEventListener('click', () => {
      const keys = SECTIONS[hd.dataset.section];
      if (!keys) return;
      const allOn = keys.every(k => document.getElementById(k)?.checked);
      for (const k of keys) {
        const el = document.getElementById(k);
        if (el) el.checked = !allOn;
      }
      save();
    });
  });

  // Daily limit pills
  document.querySelectorAll('.lpill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lpill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const customEl = document.getElementById('customLimitInput');
      if (customEl) { customEl.value = ''; customEl.classList.remove('has-value'); }
      save();
    });
  });

  // Thumbnail style pills
  document.querySelectorAll('.tpill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tpill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      save();
    });
  });

  // Theme pills
  document.querySelectorAll('.thpill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.thpill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme(btn.dataset.themeOpt);
      save();
    });
  });

  // Custom limit input
  document.getElementById('customLimitInput')?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (val > 0) {
      document.querySelectorAll('.lpill').forEach(b => b.classList.remove('active'));
      e.target.classList.add('has-value');
    } else {
      e.target.classList.remove('has-value');
    }
  });

  document.getElementById('customLimitInput')?.addEventListener('change', save);
  document.getElementById('customLimitInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.target.blur(); save(); }
  });
});
