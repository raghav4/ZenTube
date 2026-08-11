const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

const popupUrl = pathToFileURL(path.join(__dirname, '..', 'popup.html')).href;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.chrome = {
      action: { setIcon() {} },
      commands: { getAll(callback) { callback([]); } },
      runtime: { lastError: undefined },
      storage: {
        local: { get(_key, callback) { callback({}); } },
        sync: {
          get(_key, callback) { callback({}); },
          set(_value, callback) { callback?.(); },
        },
      },
      tabs: {
        create() {},
        query(_query, callback) { callback([]); },
        reload() {},
        sendMessage(_tabId, _message, callback) { callback?.(); },
      },
    };
  });

  await page.goto(popupUrl);
});

test('constrains the popup document to the control width', async ({ page }) => {
  const dimensions = await page.evaluate(() => ({
    bodyWidth: document.body.getBoundingClientRect().width,
    documentWidth: document.documentElement.getBoundingClientRect().width,
    settingsRight: document.querySelector('.settings').getBoundingClientRect().right,
  }));

  expect(dimensions).toEqual({
    bodyWidth: 340,
    documentWidth: 340,
    settingsRight: 340,
  });
});

test('keeps every popup control inside its document', async ({ page }) => {
  const overflow = await page.locator('button, input, label').evaluateAll(elements => {
    const documentWidth = document.documentElement.getBoundingClientRect().width;
    return elements
      .map(element => ({
        id: element.id || element.textContent.trim().replace(/\s+/g, ' '),
        right: element.getBoundingClientRect().right,
      }))
      .filter(({ right }) => right > documentWidth);
  });

  expect(overflow).toEqual([]);
});
