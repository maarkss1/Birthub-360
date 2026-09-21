import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../src/lib/prisma.js';

// DATA-002 / DATA-005: Trava rígida de ambiente. Este script cria usuário/organização com credenciais estáticas de teste.
if (process.env.NODE_ENV === 'production' && !process.argv.includes('--allow-demo-creation')) {
  console.error(
    'ERRO DE SEGURANÇA: scripts/create-demo.ts não pode ser executado em produção sem o flag explícito --allow-demo-creation.',
  );
  process.exit(1);
}

async function main() {
  try {
    console.log('Creating Organization...');
    const org = await prisma.organization.create({
      data: { name: 'Demo Organization ' + Date.now() },
    });

    const demoPassword = process.env.DEMO_USER_PASSWORD || `demo-${crypto.randomBytes(6).toString('hex')}!`;
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    console.log('Creating User...');
    const userId = uuidv4();

    const user = await prisma.user.create({
      data: {
        id: userId,
        name: 'Demo User',
        email: 'demo@demo.com',
        passwordHash: hashedPassword,
        role: 'ADMINISTRADOR',
        organizationId: org.id,
        emailVerified: true,
      },
    });

    console.log('Creating Account...');
    await prisma.account.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        accountId: user.email,
        providerId: 'credential',
        password: hashedPassword,
      },
    });

    console.log(`User successfully created: demo@demo.com / ${demoPassword}`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
