// Background service worker — handles the toggle keyboard command.
// Content scripts can't receive chrome.commands, so this lives here.

const SETTINGS_KEY = 'dfyt_settings';
const RATING_KEY = 'dfyt_rating';

function setActionIcon(enabled) {
  const sfx = enabled ? '-on' : '';
  chrome.action.setIcon({
    path: {
      16: `icons/icon16${sfx}.png`,
      48: `icons/icon48${sfx}.png`,
      128: `icons/icon128${sfx}.png`,
    },
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-enabled') return;
  chrome.storage.sync.get(SETTINGS_KEY, (res) => {
    const settings = res[SETTINGS_KEY] || {};
    // Default enabled is true, so an unset value counts as "on".
    const next = { ...settings, enabled: settings.enabled === false };
    chrome.storage.sync.set({ [SETTINGS_KEY]: next }, () => {
      setActionIcon(next.enabled);
    });
  });
});

// Keep the toolbar icon in sync if the state changes elsewhere (e.g. the popup).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes[SETTINGS_KEY]) return;
  setActionIcon(changes[SETTINGS_KEY].newValue?.enabled !== false);
});

// Seed the rating request install timestamp once.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== 'install' && details.reason !== 'update') return;
  chrome.storage.local.get(RATING_KEY, (res) => {
    const rating = res[RATING_KEY] || {};
    if (rating.installedAt) return;
    chrome.storage.local.set({
      [RATING_KEY]: { ...rating, installedAt: Date.now() },
    });
  });
});
