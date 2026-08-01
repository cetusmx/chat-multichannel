require('dotenv').config({ path: '.env' });
const jwt = require('jsonwebtoken');
const isSuperadmin = require('./src/middleware/superadmin.auth.middleware');
const env = require('./src/config/env');

const mockRes = {
  status: (code) => {
    return {
      json: (data) => console.log('Response JSON:', data)
    }
  }
};

const mockNext = (err) => {
  if (err) {
    console.error('Middleware Error:', err.message);
  } else {
    console.log('Middleware Passed: User is authorized');
  }
};

const normalSecret = env.jwtSecret || 'normal';
const superSecret = env.superadminJwtSecret;

console.log('--- TEST 1: No Token ---');
isSuperadmin({ headers: {} }, mockRes, mockNext);

console.log('\n--- TEST 2: Normal JWT (Tenant Admin) ---');
const normalToken = jwt.sign({ id: 'user1', role: 'ADMIN' }, normalSecret);
isSuperadmin({ headers: { authorization: `Bearer ${normalToken}` } }, mockRes, mockNext);

console.log('\n--- TEST 3: Valid Superadmin JWT ---');
const superadminToken = jwt.sign({ id: 'super1', role: 'SUPERADMIN' }, superSecret);
const validReq = { headers: { authorization: `Bearer ${superadminToken}` } };
isSuperadmin(validReq, mockRes, mockNext);

console.log('\n--- TEST 4: Superadmin secret but WRONG ROLE ---');
const wrongRoleToken = jwt.sign({ id: 'super2', role: 'ADMIN' }, superSecret);
isSuperadmin({ headers: { authorization: `Bearer ${wrongRoleToken}` } }, mockRes, mockNext);
