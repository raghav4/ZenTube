const { test, expect } = require('@playwright/test');

const harnessUrl = '/tests/rating-harness.html';

const DAY = 24 * 60 * 60 * 1000;

function buildMock() {
  return (d) => {
    globalThis.__dfyt_settings = d.settings;
    globalThis.__dfyt_rating = d.rating;
    globalThis.__dfyt_now = d.now;
    const originalDateNow = Date.now.bind(Date);
    Date.now = () => globalThis.__dfyt_now ?? originalDateNow();

    globalThis.chrome = {
      storage: {
        sync: {
          get(key, callback) { callback({ [key]: globalThis.__dfyt_settings }); },
          set() {},
          onChanged: { addListener() {} },
        },
        local: {
          get(key, callback) { callback({ [key]: globalThis.__dfyt_rating }); },
          set(data, callback) {
            const key = Object.keys(data)[0];
            globalThis.__dfyt_rating = data[key];
            callback?.();
          },
          onChanged: { addListener() {} },
        },
      },
      runtime: {
        lastError: undefined,
        onMessage: { addListener() {} },
        sendMessage() {},
      },
    };
  };
}

function makeRating(opts = {}) {
  const now = opts.now ?? Date.now();
  return {
    installedAt: opts.installedAt ?? (now - 8 * DAY),
    activeDays: opts.activeDays ?? ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
    completed: opts.completed ?? false,
    dismissed: opts.dismissed ?? false,
    lastShownAt: opts.lastShownAt ?? null,
  };
}

async function loadHarness(page, { settings, rating, now }) {
  await page.addInitScript(buildMock(), { settings, rating, now });
  await page.goto(harnessUrl);
}

async function navigateTo(page, pathname) {
  await page.evaluate((p) => {
    history.pushState(null, '', p);
    document.dispatchEvent(new Event('yt-navigate-finish'));
  }, pathname);
}

// ── Eligibility & display ──────────────────────────────────────

test('shows the rating card on watch pages when all conditions are met', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now }),
    now,
  });
  await navigateTo(page, '/watch');
  await expect(page.locator('#dfyt-rating-host')).toBeVisible();
});

test('shows the rating card on the homepage when all conditions are met', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now }),
    now,
  });
  await navigateTo(page, '/');
  await expect(page.locator('#dfyt-rating-host')).toBeVisible();
});

test('does not show the card before 7 days have passed since install', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now, installedAt: now - 6 * DAY }),
    now,
  });
  await navigateTo(page, '/watch');
  await expect(page.locator('#dfyt-rating-host')).toHaveCount(0);
});

test('does not show the card before 5 distinct active days', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now, activeDays: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-06-15'] }),
    now,
  });
  await navigateTo(page, '/watch');
  await expect(page.locator('#dfyt-rating-host')).toHaveCount(0);
});

test('does not show the card on non-eligible pages', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now }),
    now,
  });
  await navigateTo(page, '/results');
  await expect(page.locator('#dfyt-rating-host')).toHaveCount(0);
});

test('does not show the card when ZenTube is disabled', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: false },
    rating: makeRating({ now }),
    now,
  });
  await navigateTo(page, '/watch');
  await expect(page.locator('#dfyt-rating-host')).toHaveCount(0);
});

// ── Active-day tracking ────────────────────────────────────────

test('records an active day when navigating to an eligible page', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now, activeDays: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'] }),
    now,
  });
  await navigateTo(page, '/watch');
  const stored = await page.evaluate(() => globalThis.__dfyt_rating);
  expect(stored.activeDays).toContain('2024-06-15');
});

// ── Interactions ───────────────────────────────────────────────

test('Rate Zentube link points to the Chrome Web Store review page', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now }),
    now,
  });
  await navigateTo(page, '/watch');
  const href = await page.locator('#dfyt-rate-btn').getAttribute('href');
  expect(href).toBe('https://chromewebstore.google.com/detail/zentube/ljnjkcelmlkcdcghffobikpjlefjaldh/reviews');
});

test('Rate Zentube marks the request completed and removes the card', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now }),
    now,
  });
  await navigateTo(page, '/watch');
  await page.locator('#dfyt-rate-btn').click();
  await expect(page.locator('#dfyt-rating-host')).toHaveCount(0);
  const stored = await page.evaluate(() => globalThis.__dfyt_rating);
  expect(stored.completed).toBe(true);
});

test('Maybe later removes the card and enforces a 30-day cooldown', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now }),
    now,
  });
  await navigateTo(page, '/watch');
  await page.locator('#dfyt-later-btn').click();
  await expect(page.locator('#dfyt-rating-host')).toHaveCount(0);

  const afterDismiss = await page.evaluate(() => globalThis.__dfyt_rating);
  expect(afterDismiss.lastShownAt).toBeGreaterThan(0);

  // 29 days later: still on cooldown, card must not reappear.
  const later = afterDismiss.lastShownAt + 29 * DAY;
  await page.evaluate((t) => { globalThis.__dfyt_now = t; }, later);
  await navigateTo(page, '/watch');
  await expect(page.locator('#dfyt-rating-host')).toHaveCount(0);

  // 31 days later: cooldown expired, card can appear again.
  const cooledDown = afterDismiss.lastShownAt + 31 * DAY;
  await page.evaluate((t) => { globalThis.__dfyt_now = t; }, cooledDown);
  await navigateTo(page, '/watch');
  await expect(page.locator('#dfyt-rating-host')).toBeVisible();
});

test('Close button permanently dismisses the request', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now }),
    now,
  });
  await navigateTo(page, '/watch');
  await page.locator('#dfyt-rating-host .close').click();
  await expect(page.locator('#dfyt-rating-host')).toHaveCount(0);
  const stored = await page.evaluate(() => globalThis.__dfyt_rating);
  expect(stored.dismissed).toBe(true);

  // Even after a fresh eligible navigation, it must stay gone.
  await page.evaluate((t) => { globalThis.__dfyt_now = t; }, now + 60 * DAY);
  await navigateTo(page, '/watch');
  await expect(page.locator('#dfyt-rating-host')).toHaveCount(0);
});

// ── Design / theme ─────────────────────────────────────────────

test('adapts to YouTube dark theme', async ({ page }) => {
  const now = new Date('2024-06-15T12:00:00Z').getTime();
  await loadHarness(page, {
    settings: { enabled: true },
    rating: makeRating({ now }),
    now,
  });
  await navigateTo(page, '/watch');

  const lightTheme = await page.evaluate(() => document.getElementById('dfyt-rating-host')?.dataset.theme);
  expect(lightTheme).toBe('light');

  await page.evaluate(() => {
    document.documentElement.setAttribute('dark', 'true');
  });

  const darkTheme = await page.evaluate(() => document.getElementById('dfyt-rating-host')?.dataset.theme);
  expect(darkTheme).toBe('dark');
});
