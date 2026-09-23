import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const PROSPECTING_DIR = path.join(ROOT, 'src/features/prospecting');

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  if (!statSync(dirPath, { throwIfNoEntry: false })) {
    return arrayOfFiles;
  }
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const IMPORT_RE = /import\s+.*?from\s+['"]([^'"]+)['"]/gm;

describe('Clean Architecture Boundaries - Prospecting (ARCH-002)', () => {
  it('domain must not import application or infrastructure', () => {
    const domainDir = path.join(PROSPECTING_DIR, 'domain');
    const domainFiles = getAllFiles(domainDir);

    domainFiles.forEach((file) => {
      const content = readFileSync(file, 'utf-8');
      const imports: string[] = [];
      let match;
      while ((match = IMPORT_RE.exec(content)) !== null) {
        imports.push(match[1]);
      }

      imports.forEach((imp) => {
        // A simple heuristic: if it mentions 'application' or 'infra'
        // and it's a relative import or an alias import matching the feature
        const isApplication = imp.includes('/application') || imp.includes('../application');
        const isInfra = imp.includes('/infra') || imp.includes('../infra') || imp.includes('/infrastructure') || imp.includes('../infrastructure');
        
        expect(isApplication, `Domain file ${file} imports application layer: ${imp}`).toBe(false);
        expect(isInfra, `Domain file ${file} imports infrastructure layer: ${imp}`).toBe(false);
      });
    });
  });

  it('application must not import infrastructure', () => {
    const appDir = path.join(PROSPECTING_DIR, 'application');
    const appFiles = getAllFiles(appDir);

    appFiles.forEach((file) => {
      const content = readFileSync(file, 'utf-8');
      const imports: string[] = [];
      let match;
      while ((match = IMPORT_RE.exec(content)) !== null) {
        imports.push(match[1]);
      }

      imports.forEach((imp) => {
        const isInfra = imp.includes('/infra') || imp.includes('../infra') || imp.includes('/infrastructure') || imp.includes('../infrastructure');
        expect(isInfra, `Application file ${file} imports infrastructure layer: ${imp}`).toBe(false);
      });
    });
  });
});
