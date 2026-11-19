const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    headless: true,
    viewport: { width: 800, height: 600 },
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'node tests/server.js',
    url: 'http://localhost:3000/tests/rating-harness.html',
    reuseExistingServer: true,
  },
});
