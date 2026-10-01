import assert from 'node:assert/strict';

// Run against `expo start --web`, since production tree-shaking can hide
// eager Skia imports that crash development server rendering.
const baseUrl = process.env.WEB_TEST_URL ?? 'http://localhost:8081';
for (const path of ['/', '/characters', '/characters/new', '/settings', '/game/web-render-check', '/game/web-render-check/inventory', '/game/web-render-check/save-load']) {
  const response = await fetch(new URL(path, baseUrl));
  const html = await response.text();
  assert.ok(!html.includes("Cannot read properties of undefined (reading 'TypefaceFontProvider')"),
    `${path}: Skia font initialization ran before CanvasKit was loaded`);
  assert.equal(response.status, 200, `${path}: web server rendering failed`);
  console.log(`PASS ${path}: web server rendering`);
}
