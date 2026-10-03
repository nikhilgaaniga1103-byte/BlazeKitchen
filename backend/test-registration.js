#!/usr/bin/env node

/**
 * Test Registration Flow
 * Tests the connection between frontend and backend for user registration
 */

const http = require('http');

const API_URL = 'http://localhost:5000/api/auth/register';

const testUser = {
  name: 'Test User',
  email: `testuser-${Date.now()}@example.com`,
  password: 'testpass123',
  role: 'user'
};

console.log('🔥 Testing Blaze Kitchen Registration Flow...\n');
console.log('Test URL:', API_URL);
console.log('Test User:', testUser);
console.log('\n⏳ Sending registration request...\n');

const postData = JSON.stringify(testUser);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Headers:', res.headers);
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.success) {
        console.log('\n✅ Registration successful!');
        console.log('User Token:', parsed.token);
        console.log('User Data:', parsed.data.user);
      } else {
        console.log('\n❌ Registration failed:', parsed.message);
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection Error:', error.message);
  console.error('\nMake sure:');
  console.error('1. Backend is running: npm start (in backend folder)');
  console.error('2. MongoDB is connected');
  console.error('3. Port 5000 is available');
});

req.write(postData);
req.end();
