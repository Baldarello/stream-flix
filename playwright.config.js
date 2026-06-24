module.exports = {
  testDir: '.playwright-mcp',
  testMatch: '**/*.spec.js',
  use: {
    baseURL: 'http://localhost:3002',
    headless: true,
  },
  timeout: 60000,
};
