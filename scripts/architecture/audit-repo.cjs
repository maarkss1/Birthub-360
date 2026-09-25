/**
 * REPOSITORY DOCUMENTATION ARCHITECT
 * Autonomous GitHub Repository Analysis & Documentation Agent
 *
 * This script analyzes the repository and generates 6 HTML documents + INDEX + CHANGELOG.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUT_DIR = path.join(process.cwd(), 'docs', 'repository-intelligence');

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Helper to get git info
function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commit = execSync('git rev-parse --short HEAD').toString().trim();
    const date = new Date().toISOString().split('T')[0];
    return { branch, commit, date };
  } catch (e) {
    return { branch: 'unknown', commit: 'unknown', date: new Date().toISOString().split('T')[0] };
  }
}

const gitInfo = getGitInfo();

// Gather some repo stats
let fileCount = 0;
try {
  fileCount = parseInt(execSync('git ls-files | wc -l').toString().trim(), 10) || 0;
} catch(e) {}

let tableCount = 0;
try {
  const schema = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf-8');
  const matches = schema.match(/model\s+\w+\s+{/g);
  tableCount = matches ? matches.length : 0;
} catch(e) {}

// CSS for the HTML documents
const style = `
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --primary: #3b82f6;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --success: #22c55e;
      --warning: #eab308;
      --danger: #ef4444;
      --partial: #f59e0b;
      --unverified: #64748b;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .layout {
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: 250px;
      background-color: var(--surface);
      border-right: 1px solid var(--border);
      padding: 2rem 1rem;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .sidebar h2 {
      font-size: 1rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    .sidebar ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .sidebar li {
      margin-bottom: 0.5rem;
    }
    .sidebar a {
      color: var(--text);
      text-decoration: none;
      display: block;
      padding: 0.5rem;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    .sidebar a:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: var(--primary);
    }
    .main-content {
      flex: 1;
      padding: 2rem 4rem;
      max-width: 1200px;
    }
    .header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    .nav {
      margin-bottom: 2rem;
    }
    .nav a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .nav a:hover {
      text-decoration: underline;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    .card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      transition: transform 0.2s, border-color 0.2s;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: var(--primary);
    }
    .card h3 {
      margin-top: 0;
      color: var(--primary);
      font-size: 1.25rem;
    }
    .card a {
      text-decoration: none;
      color: inherit;
      display: block;
      height: 100%;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
      line-height: 1;
    }
    .badge.implemented { background-color: rgba(34, 197, 94, 0.1); color: var(--success); border: 1px solid rgba(34, 197, 94, 0.2); }
    .badge.partial { background-color: rgba(245, 158, 11, 0.1); color: var(--partial); border: 1px solid rgba(245, 158, 11, 0.2); }
    .badge.missing { background-color: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2); }
    .badge.unverified { background-color: rgba(100, 116, 139, 0.1); color: var(--unverified); border: 1px solid rgba(100, 116, 139, 0.2); }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
      font-size: 0.875rem;
    }
    th, td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      background-color: rgba(255,255,255,0.02);
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    tr:hover {
      background-color: rgba(255,255,255,0.01);
    }
    pre {
      background-color: rgba(0,0,0,0.3);
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      border: 1px solid var(--border);
    }
    code {
      font-family: var(--font-mono);
      font-size: 0.875rem;
    }
    p code, li code, td code {
      background-color: rgba(255,255,255,0.1);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.8em;
    }
    .meta-info {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      color: var(--text-muted);
      font-size: 0.875rem;
      background: var(--surface);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 2rem;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.7;
      margin-bottom: 0.25rem;
    }
    .meta-value {
      font-weight: 600;
      color: var(--text);
      font-family: var(--font-mono);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }
    .stat-label {
      font-size: 0.875rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .accordion {
      margin-top: 2rem;
    }
    .accordion-item {
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 1rem;
      overflow: hidden;
    }
    .accordion-header {
      background: var(--surface);
      padding: 1rem 1.5rem;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .accordion-header:hover {
      background: rgba(255,255,255,0.05);
    }
    .accordion-content {
      padding: 1.5rem;
      border-top: 1px solid var(--border);
      display: none;
    }

    /* Utility classes */
    .mt-8 { margin-top: 2rem; }
    .mb-4 { margin-bottom: 1rem; }
    .text-muted { color: var(--text-muted); }
  </style>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      // Simple accordion logic
      document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
          const content = header.nextElementSibling;
          const isVisible = content.style.display === 'block';
          content.style.display = isVisible ? 'none' : 'block';
          header.querySelector('.icon').textContent = isVisible ? '+' : '-';
        });
      });
    });
  </script>
`;

function createSidebar(activePage) {
  const links = [
    { href: '00-INDEX.html', label: 'Hub' },
    { href: '01-PRD.html', label: '01 - PRD' },
    { href: '02-TRD.html', label: '02 - TRD' },
    { href: '03-APP-FLOW.html', label: '03 - App Flow' },
    { href: '04-UI-UX-DESIGN.html', label: '04 - UI/UX Design' },
    { href: '05-BACKEND-SCHEMA.html', label: '05 - Backend Schema' },
    { href: '06-IMPLEMENTATION-PLAN.html', label: '06 - Implementation Plan' }
  ];

  return `
    <div class="sidebar">
      <h2>Documentation</h2>
      <ul>
        ${links.map(link => `
          <li>
            <a href="${link.href}" style="${activePage === link.href ? 'color: var(--primary); font-weight: 600; background: rgba(59, 130, 246, 0.1);' : ''}">
              ${link.label}
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function createHeader(title) {
  return `
    <div class="nav">
      <a href="00-INDEX.html">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Documentation Hub
      </a>
    </div>
    <div class="header">
      <h1>${title}</h1>
      <div class="meta-info">
        <div class="meta-item">
          <span class="meta-label">Branch</span>
          <span class="meta-value">${gitInfo.branch}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Commit</span>
          <span class="meta-value">${gitInfo.commit}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Generated Date</span>
          <span class="meta-value">${gitInfo.date}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Repository</span>
          <span class="meta-value">AtlasGR</span>
        </div>
      </div>
    </div>
  `;
}

// 00-INDEX.html
function generateIndex() {
  const content = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Repository Intelligence Hub | AtlasGR</title>
      ${style}
    </head>
    <body>
      <div class="layout">
        ${createSidebar('00-INDEX.html')}
        <div class="main-content">
          <div class="header">
            <h1>Repository Intelligence Hub</h1>
            <p class="text-muted">Autonomous Technical Documentation Portal for AtlasGR</p>

            <div class="meta-info mt-8">
              <div class="meta-item">
                <span class="meta-label">Project Name</span>
                <span class="meta-value">AtlasGR - Commercial Intelligence OS</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Branch</span>
                <span class="meta-value">${gitInfo.branch}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Commit</span>
                <span class="meta-value">${gitInfo.commit}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Date</span>
                <span class="meta-value">${gitInfo.date}</span>
              </div>
            </div>
          </div>

          <h2>Project Analytics</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${fileCount}</div>
              <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${tableCount}</div>
              <div class="stat-label">Database Tables</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">React/Vite</div>
              <div class="stat-label">Frontend</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">Node/Express</div>
              <div class="stat-label">Backend</div>
            </div>
          </div>

          <h2 class="mt-8">Documentation Modules</h2>
          <div class="card-grid">
            <div class="card">
              <a href="01-PRD.html">
                <h3>01 - PRD</h3>
                <p>Product Requirements Document. Business perspective, features, use cases, and status of implementation.</p>
              </a>
            </div>
            <div class="card">
              <a href="02-TRD.html">
                <h3>02 - TRD</h3>
                <p>Technical Requirements Document. Architecture, tech stack, infrastructure, and security implementations.</p>
              </a>
            </div>
            <div class="card">
              <a href="03-APP-FLOW.html">
                <h3>03 - App Flow</h3>
                <p>Application Flow & User Journey. Navigation maps, core states, and authentication flows.</p>
              </a>
            </div>
            <div class="card">
              <a href="04-UI-UX-DESIGN.html">
                <h3>04 - UI/UX Design</h3>
                <p>Design System & Interface Analysis. UI components (shadcn/ui), themes, typography, and styling.</p>
              </a>
            </div>
            <div class="card">
              <a href="05-BACKEND-SCHEMA.html">
                <h3>05 - Backend Schema</h3>
                <p>Database structure (Prisma), APIs, services documentation, models, and entity relationships.</p>
              </a>
            </div>
            <div class="card">
              <a href="06-IMPLEMENTATION-PLAN.html">
                <h3>06 - Implementation Plan</h3>
                <p>Actionable roadmap based on technical debt, gap analysis, and current state of the repository.</p>
              </a>
            </div>
          </div>

          <h2 class="mt-8">Legend & Status Markers</h2>
          <div>
            <span class="badge implemented">IMPLEMENTADO</span> Features fully present and functional in code.
            <br>
            <span class="badge partial">PARCIAL</span> Features partially implemented or mocked.
            <br>
            <span class="badge missing">AUSENTE</span> Planned features not found in codebase.
            <br>
            <span class="badge unverified">NAO_VERIFICADO</span> Inferred features or unable to definitively confirm.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync(path.join(OUT_DIR, '00-INDEX.html'), content);
}

// 01-PRD.html
function generatePRD() {
  const content = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>01 - PRD | Product Requirements Document | AtlasGR</title>
      ${style}
    </head>
    <body>
      <div class="layout">
        ${createSidebar('01-PRD.html')}
        <div class="main-content">
          ${createHeader('PRODUCT REQUIREMENTS DOCUMENT (PRD)')}

          <h2>1. Product Overview</h2>
          <p><strong>Name:</strong> AtlasGR</p>
          <p><strong>Description:</strong> Commercial Intelligence OS & B2B Prospector. A comprehensive platform integrating CRM, AI-driven prospecting (SDR voice & email), lead enrichment, and autonomous workflow orchestration.</p>

          <h2>2. Target Audience & Personas</h2>
          <ul>
            <li><strong>Sales Representatives (SDRs/BDRs):</strong> Needs to prospect, qualify leads, and manage pipeline efficiently.</li>
            <li><strong>Sales Managers:</strong> Needs visibility into team performance, pipeline health, and revenue forecasting.</li>
            <li><strong>RevOps / Admin:</strong> Needs to configure integrations, webhooks, security policies, and AI agent behaviors.</li>
          </ul>

          <h2>3. Feature Status & Traceability</h2>
          <table>
            <thead>
              <tr>
                <th>Module / Feature</th>
                <th>Status</th>
                <th>Traceability (Evidence)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>CRM Core</strong><br>Lead, Deal, Pipeline, Contact Management</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
                <td><code>src/features/crm/</code>, <code>src/features/companies/</code>, <code>src/features/contacts/</code><br>Prisma models: <code>Lead</code>, <code>CrmPipeline</code>, <code>CrmDealItem</code></td>
              </tr>
              <tr>
                <td><strong>AI Copilot</strong><br>LangGraph orchestration, email generation, insights</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
                <td><code>src/features/copiloto-ia/</code>, <code>src/lib/ai/features.ts</code><br>Prisma models: <code>CopilotoConversation</code>, <code>CopilotoInsight</code></td>
              </tr>
              <tr>
                <td><strong>Voice SDR (Birth Voices Hub)</strong><br>Autonomous outbound calling</td>
                <td><span class="badge partial">PARCIAL</span></td>
                <td><code>src/features/integrations/birth-voice/birthVoice.service.ts</code><br>Depends on external repository and env vars (<code>BIRTH_VOICES_URL</code>).</td>
              </tr>
              <tr>
                <td><strong>Lead Enrichment Engine</strong><br>Multi-provider data enrichment (BrasilAPI, CnpjWs, etc.)</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
                <td><code>src/features/intelligence/</code><br>Provider Adapters: <code>BrasilApiAdapter</code>, <code>CnpjWsAdapter</code></td>
              </tr>
              <tr>
                <td><strong>Autonomous Swarm Scheduler</strong><br>24/7 background lead engagement</td>
                <td><span class="badge partial">PARCIAL</span></td>
                <td><code>src/features/automations/</code>, Env vars: <code>SWARM_SCHEDULER_ENABLED</code></td>
              </tr>
              <tr>
                <td><strong>Authentication & Authorization</strong><br>RBAC, Better Auth integration</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
                <td><code>src/features/auth/</code>, <code>src/bootstrap/auth.ts</code>, <code>src/config/access-policy.ts</code></td>
              </tr>
              <tr>
                <td><strong>Webhooks & API Keys</strong><br>External integrations & event delivery</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
                <td><code>src/bootstrap/webhooks.ts</code><br>Prisma models: <code>OrganizationWebhookEndpoint</code>, <code>APIKey</code></td>
              </tr>
              <tr>
                <td><strong>Billing & Wallets</strong><br>Subscription and credit tracking</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
                <td><code>src/features/billing/</code><br>Prisma models: <code>Plan</code>, <code>Wallet</code>, <code>Transaction</code></td>
              </tr>
            </tbody>
          </table>

          <h2>4. Business Rules & Compliance</h2>
          <ul>
            <li><strong>Data Enrichment Caching:</strong> Strict 24-hour cache window (via <code>enrichedAt</code> on Company model) to minimize third-party API costs. (<span class="badge implemented">IMPLEMENTADO</span>)</li>
            <li><strong>Tenant Isolation:</strong> Enforced via PostgreSQL Row Level Security (RLS) policies based on <code>organizationId</code>. (<span class="badge implemented">IMPLEMENTADO</span>)</li>
            <li><strong>Public Endpoints:</strong> Production endpoints cannot resolve to <code>localhost</code> or <code>127.0.0.1</code> to prevent SSRF and configuration leaks. (<span class="badge implemented">IMPLEMENTADO</span>)</li>
          </ul>

          <h2>5. Technical Inconsistencies</h2>
          <div class="accordion">
            <div class="accordion-item">
              <div class="accordion-header">
                Legacy Enrichment Services <span class="badge partial">PARCIAL</span> <span class="icon">+</span>
              </div>
              <div class="accordion-content">
                <strong>Finding:</strong> Some legacy enrichment services still exist alongside the modern <code>MergeEngineService</code>. They are maintained to avoid breaking changes but need incremental refactoring.
                <br><br><strong>Evidence:</strong> Mentioned in architecture guidelines and <code>src/features/prospecting/</code> legacy files.
              </div>
            </div>
            <div class="accordion-item">
              <div class="accordion-header">
                Email Inbound/Signature Stub <span class="badge partial">PARCIAL</span> <span class="icon">+</span>
              </div>
              <div class="accordion-content">
                <strong>Finding:</strong> Webhooks for <code>/api/webhooks/email/inbound</code> and <code>/api/webhooks/signature/webhook</code> are partially stubbed without real inbound-parse providers plugged in yet, though the endpoint structure exists.
                <br><br><strong>Evidence:</strong> Notes in <code>.env.example</code> (CYC-003, CYC-006).
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync(path.join(OUT_DIR, '01-PRD.html'), content);
}

// CHANGELOG.md
function generateChangelog() {
  const content = `# Changelog

## [Auto-Generated] - ${gitInfo.date}
### Commit: ${gitInfo.commit} (${gitInfo.branch})

* Initial generation of Repository Intelligence documentation for AtlasGR.
* Created \`00-INDEX.html\` with project analytics and navigation.
* Created \`01-PRD.html\` detailing product features, CRM, Copilot, Voice SDR, and Encrichment Engine.
* Generated baseline for TRD, App Flow, UI/UX, Backend Schema, and Implementation Plan.
`;
  fs.writeFileSync(path.join(OUT_DIR, 'CHANGELOG.md'), content);
}

// Ensure module exports if imported, else run
generateIndex();
generatePRD();
generateChangelog();

console.log('Successfully generated 00-INDEX.html, 01-PRD.html, and CHANGELOG.md in docs/repository-intelligence/');

// 02-TRD.html
function generateTRD() {
  const content = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>02 - TRD | Technical Requirements Document | AtlasGR</title>
      ${style}
    </head>
    <body>
      <div class="layout">
        ${createSidebar('02-TRD.html')}
        <div class="main-content">
          ${createHeader('TECHNICAL REQUIREMENTS DOCUMENT (TRD)')}

          <h2>1. Architecture Overview</h2>
          <p>The AtlasGR architecture strictly follows Clean Architecture separation principles (Presentation, Application, Domain, Infrastructure, Shared, Core, Config, Tests).</p>

          <pre>
USER (Browser / Client)
  ↓
[ Presentation Layer ] (React / Vite Frontend)
  ↓
[ Routing / Express ] (server.ts)
  ↓
[ Controllers ] (Orchestrators, No Business Logic)
  ↓
[ Application Layer ] (Use Cases)
  ↓
[ Domain Layer ] (Interfaces, Entities, Framework-independent)
  ↓
[ Infrastructure Layer ] (Prisma Repositories, Adapters, AI Gateways)
  ↓
[ Databases & External Services ] (PostgreSQL, Redis, Meilisearch, LiteLLM)
          </pre>

          <h2>2. Technology Stack</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Technology</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Language</strong></td>
                <td>TypeScript (100% strict)</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Frontend Framework</strong></td>
                <td>React, Vite, Tailwind CSS, shadcn/ui</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Backend Runtime</strong></td>
                <td>Node.js, Express (ES Modules via tsx)</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Database & ORM</strong></td>
                <td>PostgreSQL (with pgvector), Prisma ORM</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Cache & Queues</strong></td>
                <td>Redis, BullMQ (Separate connection pools)</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Search</strong></td>
                <td>Meilisearch</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>AI Orchestration</strong></td>
                <td>LiteLLM (Gateway), LangGraph, Xenova/transformers (Local Embeddings)</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Authentication</strong></td>
                <td>Better Auth</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Observability</strong></td>
                <td>OpenTelemetry (OTEL), Prometheus, Grafana, Pino, Sentry</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Testing</strong></td>
                <td>Vitest (Unit/Integration), Playwright (E2E)</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Deployment</strong></td>
                <td>Docker, Oracle Cloud (OCI), GitHub Pages (Frontend static)</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
            </tbody>
          </table>

          <h2>3. Security & Compliance</h2>
          <ul>
            <li><strong>Row Level Security (RLS):</strong> Enforced at the database level for tenant isolation via Prisma static migration DDL.</li>
            <li><strong>Authentication Bypass:</strong> <code>ALLOW_DEV_AUTH_BYPASS=true</code> is available for local dev but blocked in production.</li>
            <li><strong>Log Redaction:</strong> Pino logger explicitly redacts sensitive fields (passwords, auth headers).</li>
            <li><strong>Dependency Injection:</strong> Implemented via a centralized manual container (<code>src/shared/di/container.ts</code>). Singletons are prohibited.</li>
            <li><strong>Production URL Validation:</strong> <code>PUBLIC_BASE_URL</code> cannot be localhost in production mode.</li>
          </ul>

          <h2>4. Integration Catalog</h2>
          <ul>
            <li><strong>Birth Voices Hub:</strong> Voice SDR integration (<code>BIRTH_VOICES_URL</code>).</li>
            <li><strong>Bland AI:</strong> Voice AI wrapper.</li>
            <li><strong>Data Enrichment:</strong> BrasilAPI, CnpjWs, Google Places, Apollo.</li>
            <li><strong>Open Source Ecosystem:</strong> Flowise, n8n, Casdoor, Infisical, Vault, Qdrant, LiveKit, Chatwoot, Postal, Plane. (Defined in <code>.env.example</code>).</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync(path.join(OUT_DIR, '02-TRD.html'), content);
}

// 05-BACKEND-SCHEMA.html
function generateBackendSchema() {
  let schemaContent = '';
  try {
    schemaContent = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf-8');
  } catch(e) {
    schemaContent = '// Unable to read schema.prisma';
  }

  // Extract models simply
  const modelRegex = /model\s+(\w+)\s+{([\s\S]*?)}/g;
  let modelsHtml = '';
  let match;

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2].trim().split('\\n').slice(0, 5).join('\\n') + '\\n  ...'; // Just a preview
    modelsHtml += `
      <div class="accordion-item">
        <div class="accordion-header">
          ${modelName} <span class="icon">+</span>
        </div>
        <div class="accordion-content">
          <pre><code>${modelBody}</code></pre>
        </div>
      </div>
    `;
  }

  const content = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>05 - BACKEND SCHEMA | Database & APIs | AtlasGR</title>
      ${style}
    </head>
    <body>
      <div class="layout">
        ${createSidebar('05-BACKEND-SCHEMA.html')}
        <div class="main-content">
          ${createHeader('BACKEND SCHEMA')}

          <h2>1. Database Schema (Prisma / PostgreSQL)</h2>
          <p>Total tables discovered: <strong>${tableCount}</strong></p>
          <p>Database enforces Row Level Security (RLS) on all multi-tenant models using <code>organizationId</code>.</p>

          <div class="accordion">
            ${modelsHtml}
          </div>

          <h2>2. API Endpoints</h2>
          <table>
            <thead>
              <tr>
                <th>Endpoint Category</th>
                <th>Path</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Health Checks</strong></td>
                <td><code>/health/live</code>, <code>/health/ready</code>, <code>/health/version</code></td>
                <td>Liveness, readiness probes and version info for OCI deployment gates.</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Authentication</strong></td>
                <td><code>/api/auth/*</code></td>
                <td>Better Auth routes for login, session management.</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Feature Routes</strong></td>
                <td><code>/api/*</code></td>
                <td>CRM, Prospecting, Intelligence endpoints exposed via Express.</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Webhooks</strong></td>
                <td><code>/api/webhooks/*</code></td>
                <td>Inbound webhooks for integrations (Voice, Email, Signatures). Pre-JSON parsed.</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
              <tr>
                <td><strong>Observability</strong></td>
                <td><code>/metrics</code></td>
                <td>Prometheus metrics export.</td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
            </tbody>
          </table>

          <h2>3. Queues & Workers</h2>
          <p>The system uses <strong>BullMQ</strong> backed by Redis for background processing. Workers are embedded and can be started via <code>startEmbeddedWorkers()</code>.</p>
          <ul>
            <li><strong>Worker Connection:</strong> Explicitly separate from Express rate limiting to prevent throughput blocking.</li>
            <li><strong>Monitoring:</strong> Bull Board is mounted at boot.</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync(path.join(OUT_DIR, '05-BACKEND-SCHEMA.html'), content);
}

generateTRD();
generateBackendSchema();
console.log('Successfully generated 02-TRD.html and 05-BACKEND-SCHEMA.html');

// 03-APP-FLOW.html
function generateAppFlow() {
  const content = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>03 - APP FLOW | Application Flow & User Journey | AtlasGR</title>
      ${style}
    </head>
    <body>
      <div class="layout">
        ${createSidebar('03-APP-FLOW.html')}
        <div class="main-content">
          ${createHeader('APPLICATION FLOW & USER JOURNEY')}

          <h2>1. Core Navigation Map</h2>
          <pre>
[PUBLIC ROUTES]
  ├─ / (Landing Page)
  ├─ /login (Authentication)
  ├─ /register (Sign Up)
  └─ /forgot-password

[AUTHENTICATED ROUTES (/app)]
  ├─ Dashboard
  │
  ├─ CRM Module
  │   ├─ Pipeline
  │   ├─ Leads
  │   └─ Deals
  │
  ├─ Prospecting Module
  │   ├─ Contact Lists
  │   └─ Campaigns
  │
  ├─ Intelligence Module
  │   ├─ Market Analysis
  │   └─ AI Insights
  │
  └─ Settings
      ├─ Profile
      ├─ Organization Settings
      └─ Integrations
          </pre>

          <h2>2. State Management & Guards</h2>
          <ul>
            <li><strong>Router:</strong> HashRouter is used instead of BrowserRouter to natively prevent 404 errors on GitHub Pages static deployments.</li>
            <li><strong>Auth Guard:</strong> Protected routes redirect to <code>/login</code> if the Better Auth session is missing.</li>
            <li><strong>Loading States:</strong> React Suspense and skeletons are used for lazy-loaded modules.</li>
            <li><strong>Toast Notifications:</strong> Global toast system (<code>src/lib/toast.ts</code>) handles success/error feedback. Native <code>alert()</code> is strictly prohibited.</li>
          </ul>

          <h2>3. Key Workflows</h2>
          <div class="accordion">
            <div class="accordion-item">
              <div class="accordion-header">
                Authentication Flow <span class="badge implemented">IMPLEMENTADO</span> <span class="icon">+</span>
              </div>
              <div class="accordion-content">
                User navigates to <code>/login</code> &rarr; Enters credentials or uses OAuth (Better Auth) &rarr; Backend validates session &rarr; Redirects to <code>/app</code> (Dashboard). Local dev can bypass this via <code>ALLOW_DEV_AUTH_BYPASS=true</code>.
              </div>
            </div>
            <div class="accordion-item">
              <div class="accordion-header">
                Lead Enrichment Flow <span class="badge implemented">IMPLEMENTADO</span> <span class="icon">+</span>
              </div>
              <div class="accordion-content">
                User adds Lead CNPJ/Domain &rarr; Backend triggers <code>MergeEngineService</code> &rarr; Cascades through Providers (BrasilAPI, CnpjWs) &rarr; Updates Prisma Model (<code>enrichedAt</code> cached 24h) &rarr; Real-time UI update.
              </div>
            </div>
            <div class="accordion-item">
              <div class="accordion-header">
                Image Upload & OCR <span class="badge implemented">IMPLEMENTADO</span> <span class="icon">+</span>
              </div>
              <div class="accordion-content">
                User selects image &rarr; <code>OcrCapturePanel.tsx</code> compresses/normalizes via Canvas API (max 1200x1200) &rarr; Uploads to Backend &rarr; Processed via <code>tesseract.js</code>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync(path.join(OUT_DIR, '03-APP-FLOW.html'), content);
}

// 04-UI-UX-DESIGN.html
function generateUIUX() {
  const content = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>04 - UI/UX DESIGN | Design System & Interface Analysis | AtlasGR</title>
      ${style}
    </head>
    <body>
      <div class="layout">
        ${createSidebar('04-UI-UX-DESIGN.html')}
        <div class="main-content">
          ${createHeader('UI/UX DESIGN SYSTEM & INTERFACE ANALYSIS')}

          <h2>1. Design System Overview</h2>
          <p>The AtlasGR interface is built using <strong>React</strong>, <strong>Tailwind CSS</strong>, and <strong>shadcn/ui</strong>. It emphasizes a clean, enterprise-grade data-dense design optimized for B2B operations.</p>

          <h2>2. Core Technologies</h2>
          <table>
            <thead>
              <tr>
                <th>Technology</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Tailwind CSS</strong></td>
                <td>Utility-first styling, design tokens, responsive breakpoints, dark/light mode execution.</td>
              </tr>
              <tr>
                <td><strong>shadcn/ui</strong></td>
                <td>Accessible, customizable baseline components (Buttons, Inputs, Dialogs, etc.).</td>
              </tr>
              <tr>
                <td><strong>Lucide React</strong></td>
                <td>Consistent SVG iconography across the platform.</td>
              </tr>
              <tr>
                <td><strong>TanStack Table</strong></td>
                <td>Complex, sortable, paginated data grids for CRM and lead lists.</td>
              </tr>
            </tbody>
          </table>

          <h2>3. Component Inventory (Sample)</h2>
          <div class="accordion">
            <div class="accordion-item">
              <div class="accordion-header">
                Toasts / Notifications <span class="badge implemented">IMPLEMENTADO</span> <span class="icon">+</span>
              </div>
              <div class="accordion-content">
                <strong>Location:</strong> <code>src/lib/toast.ts</code><br>
                <strong>Usage:</strong> Non-blocking user feedback (<code>toast.success</code>, <code>toast.error</code>). Replaces all native <code>alert()</code> calls.
              </div>
            </div>
            <div class="accordion-item">
              <div class="accordion-header">
                Data Tables <span class="badge implemented">IMPLEMENTADO</span> <span class="icon">+</span>
              </div>
              <div class="accordion-content">
                <strong>Usage:</strong> CRM Lead lists, Activity logs. Built heavily on TanStack Table for headless UI state management, styled via Tailwind.
              </div>
            </div>
          </div>

          <h2>4. ID Generation Security</h2>
          <p>Frontend unique ID generation strictly utilizes <code>crypto.randomUUID()</code> to ensure cryptographic safety and collision resistance, expressly avoiding weak implementations like <code>Math.random()</code>.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync(path.join(OUT_DIR, '04-UI-UX-DESIGN.html'), content);
}

// 06-IMPLEMENTATION-PLAN.html
function generateImplementationPlan() {
  const content = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>06 - IMPLEMENTATION PLAN | Actionable Roadmap | AtlasGR</title>
      ${style}
    </head>
    <body>
      <div class="layout">
        ${createSidebar('06-IMPLEMENTATION-PLAN.html')}
        <div class="main-content">
          ${createHeader('IMPLEMENTATION PLAN')}

          <h2>Execution Strategy</h2>
          <p>This plan addresses the technical debt, feature gaps, and architectural evolution required for AtlasGR. All new development must follow the sequence: 1. Audit 2. Verify 3. Refactor 4. Integrate Open Source 5. Code 6. Test 7. Document.</p>

          <h2>Phase 1: TECHNICAL DEBT & CLEANUP</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Task</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>TD-01</td>
                <td>Refactor legacy enrichment services. Migrate older implementations to the unified <code>MergeEngineService</code> cascade.</td>
                <td><span class="badge" style="background: rgba(234,179,8,0.2); color: #eab308; border: 1px solid rgba(234,179,8,0.5)">HIGH</span></td>
                <td>PENDING</td>
              </tr>
              <tr>
                <td>TD-02</td>
                <td>Eliminate simulated/mocked functionality (Onda 1 directive). Replace <code>setTimeout</code> mocks with real async DB calls.</td>
                <td><span class="badge" style="background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.5)">CRITICAL</span></td>
                <td>IN PROGRESS</td>
              </tr>
            </tbody>
          </table>

          <h2>Phase 2: FEATURE COMPLETION</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Task</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>FEAT-01</td>
                <td>Implement actual email parsing for inbound webhooks (<code>/api/webhooks/email/inbound</code>) currently marked as stubs.</td>
                <td><span class="badge" style="background: rgba(234,179,8,0.2); color: #eab308; border: 1px solid rgba(234,179,8,0.5)">HIGH</span></td>
                <td>PENDING</td>
              </tr>
              <tr>
                <td>FEAT-02</td>
                <td>Complete Autonomous Swarm Scheduler logic to utilize BullMQ for 24/7 engagement routing.</td>
                <td><span class="badge" style="background: rgba(59,130,246,0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.5)">MEDIUM</span></td>
                <td><span class="badge partial">PARCIAL</span></td>
              </tr>
            </tbody>
          </table>

          <h2>Phase 3: INFRASTRUCTURE & OBSERVABILITY</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Task</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>INF-01</td>
                <td>Validate OpenTelemetry traces integration with Grafana dashboard configuration.</td>
                <td><span class="badge" style="background: rgba(59,130,246,0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.5)">MEDIUM</span></td>
                <td>PENDING</td>
              </tr>
              <tr>
                <td>INF-02</td>
                <td>Verify OCI deployment scripts strictly block on failed <code>/health/live</code> responses.</td>
                <td><span class="badge" style="background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.5)">CRITICAL</span></td>
                <td><span class="badge implemented">IMPLEMENTADO</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync(path.join(OUT_DIR, '06-IMPLEMENTATION-PLAN.html'), content);
}

generateAppFlow();
generateUIUX();
generateImplementationPlan();
console.log('Successfully generated 03-APP-FLOW.html, 04-UI-UX-DESIGN.html, and 06-IMPLEMENTATION-PLAN.html');
