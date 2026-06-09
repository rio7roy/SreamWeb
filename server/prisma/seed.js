const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@stream.edu' },
    update: {},
    create: {
      email: 'admin@stream.edu',
      username: 'admin',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
      isMainAdmin: true,
    },
  });

  console.log(`✅ Admin user created: ${admin.email}`);

  // Create demo users for each role
  const demoUsers = [
    { email: 'expert@stream.edu', username: 'expert_demo', name: 'Dr. Sarah Chen', role: 'EXPERT' },
    { email: 'lab@stream.edu', username: 'lab_demo', name: 'STREAM Hub Manager', role: 'STREAM_LAB' },
    { email: 'ilab@stream.edu', username: 'ilab_demo', name: 'iLab School Director', role: 'ILAB_SCHOOL' },
    { email: 'creative@stream.edu', username: 'creative_demo', name: 'Creative Corner Lead', role: 'CREATIVE_CORNER' },
  ];

  const demoPassword = await bcrypt.hash('Demo@123', 12);

  for (const user of demoUsers) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
        password: demoPassword,
        isActive: true,
      },
    });
    console.log(`✅ Demo user created: ${created.email} (${created.role})`);
  }

  console.log('\n🎉 Seeding complete!');
  console.log('──────────────────────────────');
  console.log('Admin Login:  admin@stream.edu / Admin@123');
  console.log('Demo Logins:  [role]@stream.edu / Demo@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
