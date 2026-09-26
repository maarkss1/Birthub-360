const fs = require('fs');
let content = fs.readFileSync('scripts/ci/check-bundle-budget.mjs', 'utf8');

content = content.replace(
  /export const MAX_TOTAL_GZIP_BYTES = Number\([\s\S]*?\);/,
  `export const MAX_TOTAL_GZIP_BYTES = Number(
  process.env.BUNDLE_BUDGET_MAX_TOTAL_GZIP_BYTES ?? 3 * 1024 * 1024,
);`
);

content = content.replace(
  /export const MAX_FILE_GZIP_BYTES = Number\([\s\S]*?\);/,
  `export const MAX_FILE_GZIP_BYTES = Number(
  process.env.BUNDLE_BUDGET_MAX_FILE_GZIP_BYTES ?? 500 * 1024,
);`
);

fs.writeFileSync('scripts/ci/check-bundle-budget.mjs', content);
