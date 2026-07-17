import { PrismaPg } from '@prisma/adapter-pg';
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

  console.log('Seeded roles and request categories.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
