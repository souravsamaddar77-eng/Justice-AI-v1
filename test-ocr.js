// Backward-compatible entry point. Only fixed synthetic fixtures are used.
// `node test-ocr.js` is deterministic; `node test-ocr.js --live` tests OCR.space.
const { spawnSync } = require('node:child_process');
const live = process.argv.includes('--live');
const args = live ? ['node_modules/tsx/dist/cli.mjs', 'scripts/verify-ocr-live.ts'] : ['node_modules/tsx/dist/cli.mjs', '--test', 'tests/ocr.test.ts'];
const result = spawnSync(process.execPath, args, { cwd: __dirname, stdio: 'inherit', windowsHide: true });
process.exitCode = result.status ?? 1;
