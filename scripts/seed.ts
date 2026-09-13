import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting baseline seed...');

  const org = await prisma.organization.upsert({
    where: { name: 'Acme Corp Enterprise' },
    update: {},
    create: {
      name: 'Acme Corp Enterprise',
    },
  });

  console.log(`Organization created/found: ${org.id}`);

  // Create an Admin user
  const adminEmail = 'admin@acmecorp.com';
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        name: 'System Admin',
        email: adminEmail,
        passwordHash: '$2b$10$eImiTXuWVxfM37uY4JANjQ==', // This is just a dummy hash for the seed
        role: 'ADMIN',
        organizationId: org.id,
      },
    });
    console.log('Admin user created');
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
