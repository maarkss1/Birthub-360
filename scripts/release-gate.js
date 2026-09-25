
const { execSync } = require('child_process');

function run(cmd, name, optional = false) {
  try {
    process.stdout.write(⏳ Executando ... );
    execSync(cmd, { stdio: 'ignore' });
    console.log('✅ APROVADO');
    return { name, status: 'PASS', critical: !optional };
  } catch (e) {
    if (optional) {
      console.log('⚠️ WARNING (Não bloqueante)');
      return { name, status: 'WARN', critical: false };
    } else {
      console.log('❌ FALHOU');
      return { name, status: 'FAIL', critical: true };
    }
  }
}

const checks = [
  run('npm run lint', 'Lint', false),
  run('npm run typecheck', 'Typecheck', false),
  run('npm run test:unit', 'Testes Unitários', false),
  run('npm run build', 'Build da Aplicação', false),
  run('npm run security:dependency-inventory', 'Security Inventory', true),
];

const hasBlockers = checks.some(c => c.status === 'FAIL' && c.critical);
const sha = execSync('git rev-parse HEAD').toString().trim();

console.log('\n=============================================');
console.log(SHA: );
console.log('STATUS: ' + (hasBlockers ? 'NO-GO' : 'GO'));
console.log('CHECKS:');
checks.forEach(c => {
  console.log(- : );
});
console.log('=============================================');

if (hasBlockers) {
  process.exit(1);
}

