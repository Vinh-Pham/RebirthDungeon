import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
    testDir: 'tests/browser',
    timeout: 120000,
    expect: { timeout: 10000 },
    use: {
        baseURL: 'http://127.0.0.1:8081',
        viewport: { width: 1440, height: 1000 },
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'pnpm dev --mode e2e --port 8081',
        url: 'http://127.0.0.1:8081',
        reuseExistingServer: true,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
        },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ],
});