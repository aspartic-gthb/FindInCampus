import bcrypt from 'bcrypt';
import prisma from './src/utils/database';

async function run() {
  try {
    const password = 'password123';
    const email = 'testscratch@server.com';
    const name = 'testscratch';

    console.log('Hashing...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Upserting...', hashedPassword);
    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hashedPassword, name: name || email.split('@')[0] },
      create: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
      }
    });

    console.log('Success:', user);
  } catch (error) {
    console.error('ERROR OCCURRED:');
    console.error(error);
  }
}

run();
