import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { fakeTransactionComplete, fakeProductStockComplete } from './fake-data';

const prisma = new PrismaClient();

// A `main` function so that we can use async/await
async function main() {
  // Create or update default user
  const defaultPassword = hashSync('123456', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrator',
      email: 'admin@pos.local',
      password: defaultPassword,
      role: 'OWNER',
    },
  });

  console.log('Default user created/updated: admin (password: 123456)');

  await prisma.productStock.deleteMany({});
  const fakerRounds = 40;
  for (let i = 0; i < fakerRounds; i++) {
    const product = await prisma.productStock.create({
      data: {
        ...fakeProductStockComplete(),
      },
    });
    console.log(`Created transactions with id ${product.id} and name`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
