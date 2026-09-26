import { execSync } from 'child_process';
try {
  const out = execSync('node --input-type=module --env-file=.env', {
    input: 'import "./server.ts"',
    timeout: 10000,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('OUT:', out);
} catch(e) {
  console.error('STDERR:', e.stderr);
  console.error('STDOUT:', e.stdout);
  console.error('MSG:', e.message);
}
