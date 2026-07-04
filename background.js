// Background service worker — handles the toggle keyboard command.
// Content scripts can't receive chrome.commands, so this lives here.

const SETTINGS_KEY = 'dfyt_settings';

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
