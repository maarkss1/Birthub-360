
import { execSync } from 'child_process';

function run(cmd, name, optional = false) {
  try {
    process.stdout.write('Executando ' + name + '... ');
    execSync(cmd, { stdio: 'ignore' });
    console.log('APROVADO');
    return { name, status: 'PASS', critical: !optional };
  } catch (e) {
    if (optional) {
      console.log('WARNING (Nao bloqueante)');
      return { name, status: 'WARN', critical: false };
    } else {
      console.log('FALHOU');
      return { name, status: 'FAIL', critical: true };
    }
  }
}

const checks = [
  run('npm run lint', 'Lint', false),
  run('npm run typecheck', 'Typecheck', false),
  run('npm run test:unit', 'Testes Unitarios', false),
  run('npm run build', 'Build da Aplicacao', false),
  run('npm run security:dependency-inventory', 'Security Inventory', true),
];

const hasBlockers = checks.some(c => c.status === 'FAIL' && c.critical);
const sha = execSync('git rev-parse HEAD').toString().trim();

console.log('\n=============================================');
console.log('SHA: ' + sha);
console.log('STATUS: ' + (hasBlockers ? 'NO-GO' : 'GO'));
console.log('CHECKS:');
checks.forEach(c => {
  console.log('- ' + c.name + ': ' + c.status);
});
console.log('=============================================');

if (hasBlockers) {
  process.exit(1);
}

