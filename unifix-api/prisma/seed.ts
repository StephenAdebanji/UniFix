import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROLES = ['STUDENT_STAFF', 'MAINTENANCE_OFFICER', 'ADMINISTRATOR'] as const;

const CATEGORIES = [
  'Electricity',
  'Plumbing',
  'Furniture',
  'Internet / Network',
  'Classroom Equipment',
  'Hostel Maintenance',
  'Other',
];

const DEMO_PASSWORD = 'password123';

const DEMO_USERS = [
  {
    name: 'Dr. Amina Osei',
    email: 'admin@uni.edu',
    department: 'Facilities Management',
    role: 'ADMINISTRATOR' as const,
  },
  {
    name: 'Kofi Mensah',
    email: 'officer@uni.edu',
    department: 'Electrical',
    role: 'MAINTENANCE_OFFICER' as const,
  },
  {
    name: 'Yaw Boateng',
    email: 'student@uni.edu',
    department: 'Computer Science',
    role: 'STUDENT_STAFF' as const,
  },
];

async function main() {
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of CATEGORIES) {
    await prisma.requestCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const demoUser of DEMO_USERS) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: demoUser.role },
    });
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {},
      create: {
        name: demoUser.name,
        email: demoUser.email,
        department: demoUser.department,
        passwordHash,
        roleId: role.id,
      },
    });
  }

  console.log('Seeded roles, request categories, and demo accounts.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
