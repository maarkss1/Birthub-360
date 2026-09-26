const fs = require('fs');

let script = fs.readFileSync('scripts/visual-capture-agent.ts', 'utf8');
script = script.replace(/const VIEWPORTS = \[\n  \{ name: 'Desktop', width: 1280, height: 800 \}\n\];/g, "const VIEWPORTS = [\n  { name: 'Desktop', width: 1280, height: 800 },\n  { name: 'Tablet', width: 768, height: 1024 },\n  { name: 'Mobile', width: 375, height: 667 }\n];");
script = script.replace(/const ROUTES = \[\n  '\/login',\n  '\/app\/dashboard'\n\];/g, "const ROUTES = [\n  '/login',\n  '/app/dashboard',\n  '/app/crm',\n  '/app/prospect',\n  '/app/intelligence',\n  '/app/analytics',\n  '/app/integrations',\n  '/app/settings'\n];");
fs.writeFileSync('scripts/visual-capture-agent.ts', script);
