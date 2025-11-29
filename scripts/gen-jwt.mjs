/**
 * Generate JWT token for local development/testing
 * 
 * Usage:
 *   node scripts/gen-jwt.mjs
 *   JWT_SECRET=my-secret node scripts/gen-jwt.mjs
 *   node scripts/gen-jwt.mjs user-456
 */

import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'super-secret-dev-token';
const userId = process.argv[2] || 'user-123';

const payload = {
  sub: userId,
  email: `${userId}@example.com`,
  role: 'user',
};

const token = jwt.sign(payload, secret, {
  algorithm: 'HS256',
  expiresIn: '1h',
});

console.log('='.repeat(60));
console.log('JWT Token Generated');
console.log('='.repeat(60));
console.log(`User ID: ${userId}`);
console.log(`Secret:  ${secret}`);
console.log(`Expires: 1 hour`);
console.log('='.repeat(60));
console.log(token);
console.log('='.repeat(60));
