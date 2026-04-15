import prisma from '../src/utils/database';

async function main() {
  const dummyUser = await prisma.user.upsert({
    where: { email: 'dummy@test.com' },
    update: { id: 'user_dummy_123', name: 'John Doe' },
    create: {
      id: 'user_dummy_123',
      email: 'dummy@test.com',
      name: 'John Doe',
      phone: '1234567890'
    }
  });
  console.log('Dummy user created/updated:', dummyUser);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
