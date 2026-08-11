const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

const websiteUrl = pathToFileURL(path.join(__dirname, '..', 'docs', 'index.html')).href;
const releasesApi = 'https://api.github.com/repos/raghav4/ZenTube/releases?per_page=5';

test('renders GitHub issue and commit references as links', async ({ page }) => {
  await page.route(releasesApi, route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([{
      tag_name: 'v1.1.3',
      published_at: '2026-08-11T07:32:29Z',
      html_url: 'https://github.com/raghav4/ZenTube/releases/tag/v1.1.3',
      body: '### Bug Fixes\n\n* **popup:** constrain popup document width ([#9](https://github.com/raghav4/ZenTube/issues/9)) ([850ef18](https://github.com/raghav4/ZenTube/commit/850ef183152c1f16b3a03cf4d56eb7f610ce2fc0))',
    }]),
  }));

  await page.goto(websiteUrl);

  const release = page.locator('.release-body');
  await expect(release.locator('strong')).toHaveText('popup:');
  await expect(release.getByRole('link', { name: '#9' })).toHaveAttribute(
    'href',
    'https://github.com/raghav4/ZenTube/issues/9',
  );
  await expect(release.getByRole('link', { name: '850ef18' })).toHaveAttribute(
    'href',
    'https://github.com/raghav4/ZenTube/commit/850ef183152c1f16b3a03cf4d56eb7f610ce2fc0',
  );
  await expect(release).not.toContainText('[#9](');
});
