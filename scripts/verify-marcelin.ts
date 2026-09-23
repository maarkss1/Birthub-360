import { prisma } from '../src/lib/prisma.js';

async function main() {
  try {
    await prisma.user.update({
      where: { email: 'marcelinmark@gmail.com' },
      data: { emailVerified: true },
    });
    console.log('User verified!');
  } catch (err) {
    console.error('Error verifying user:', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
