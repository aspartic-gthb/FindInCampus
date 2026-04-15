async function test() {
  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `test${Date.now()}@server.com`, password: 'password123', name: 'testuser' })
  });
  console.log(res.status, await res.text());
}
test();
