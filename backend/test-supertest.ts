import request from 'supertest';
import app from './src/index';

async function test() {
  console.log('Testing...');
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: `testsuper${Date.now()}@server.com`, password: 'password123', name: 'testuser' });
  
  console.log(res.status, res.body);
  process.exit(0);
}
test();
