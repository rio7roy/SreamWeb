const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/users/experts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => {
  console.error(error);
});

req.write(JSON.stringify({ name: "Test", email: "test@test.com" }));
req.end();
