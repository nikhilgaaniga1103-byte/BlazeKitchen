#!/usr/bin/env node

/**
 * 🔥 BLAZE KITCHEN - Complete API & Connection Test
 * Tests all connections and verifies all API endpoints
 */

const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

let testResults = {
  connection: {},
  health: {},
  auth: {},
  menu: {},
  users: {}
};

const log = (msg, color = 'reset') => {
  console.log(`${colors[color]}${msg}${colors.reset}`);
};

const section = (title) => {
  console.log('\n' + colors.bright + '━'.repeat(70) + colors.reset);
  log(title, 'cyan');
  console.log(colors.bright + '━'.repeat(70) + colors.reset);
};

// ─────────────────────────────────────────────────────────────────────
// 1. TEST MONGODB CONNECTION
// ─────────────────────────────────────────────────────────────────────
section('📦 TESTING MONGODB CONNECTION');

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 5000
})
.then(() => {
  log('✅ MongoDB Connected Successfully', 'green');
  log(`   URI: ${process.env.MONGO_URI}`, 'blue');
  testResults.connection.mongodb = { status: 'connected', uri: process.env.MONGO_URI, passed: true };
  
  // Start API tests after DB connection
  setTimeout(runAPITests, 500);
})
.catch(err => {
  log('❌ MongoDB Connection Failed', 'red');
  log(`   Error: ${err.message}`, 'yellow');
  testResults.connection.mongodb = { status: 'failed', error: err.message, passed: false };
  
  // Still try to run API tests against the server
  log('\n⚠️  Continuing with API tests (server may not have DB)...', 'yellow');
  setTimeout(runAPITests, 500);
});

// ─────────────────────────────────────────────────────────────────────
// 2. TEST HEALTH CHECK & API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────
function runAPITests() {
  const baseURL = `http://localhost:${process.env.PORT || 5000}`;
  let testsCompleted = 0;
  const totalTests = 13;

  const makeRequest = (method, endpoint, data = null, headers = {}) => {
    return new Promise((resolve) => {
      const url = new URL(endpoint, baseURL);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: JSON.parse(responseData)
            });
          } catch {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: responseData
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ error: err.message, status: 0 });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  };

  // Test data
  let registeredUser = null;
  let userToken = null;
  const testEmail = `test${Date.now()}${Math.random().toString(36).substring(7)}@example.com`;
  const testPassword = 'testpass123';

  const tests = [
    // HEALTH CHECK
    {
      name: 'Health Check',
      method: 'GET',
      endpoint: '/api/health',
      category: 'health',
      check: (res) => res.status === 200
    },

    // AUTH TESTS
    {
      name: 'Register User',
      method: 'POST',
      endpoint: '/api/auth/register',
      data: {
        name: 'Test User ' + Date.now(),
        email: testEmail,
        password: testPassword
      },
      category: 'auth',
      check: (res) => {
        if (res.status === 201 || res.status === 200) {
          registeredUser = res.body.data?.user;
          userToken = res.body.token;
          log(`      Token received: ${userToken ? userToken.substring(0, 20) + '...' : 'NONE'}`, 'blue');
          return true;
        }
        return false;
      }
    },

    {
      name: 'Login User',
      method: 'POST',
      endpoint: '/api/auth/login',
      data: {
        email: testEmail,
        password: testPassword
      },
      category: 'auth',
      check: (res) => {
        if (res.status === 200 && res.body.token) {
          userToken = res.body.token;
          log(`      Token updated: ${userToken ? userToken.substring(0, 20) + '...' : 'NONE'}`, 'blue');
          return true;
        }
        log(`      Response: ${JSON.stringify(res.body)}`, 'yellow');
        return false;
      },
      skipIfFailed: 'Register User'
    },

    {
      name: 'Get Current User',
      method: 'GET',
      endpoint: '/api/auth/me',
      category: 'auth',
      getHeaders: (context) => ({ Authorization: `Bearer ${context.userToken}` }),
      check: (res) => res.status === 200,
      skipIfFailed: 'Register User'
    },

    // MENU TESTS
    {
      name: 'Get All Menu Items',
      method: 'GET',
      endpoint: '/api/menu',
      category: 'menu',
      check: (res) => res.status === 200 && Array.isArray(res.body.data)
    },

    {
      name: 'Get Menu by Category (burgers)',
      method: 'GET',
      endpoint: '/api/menu?category=burgers',
      category: 'menu',
      check: (res) => res.status === 200
    },

    {
      name: 'Get Menu by Category (beverages)',
      method: 'GET',
      endpoint: '/api/menu?category=beverages',
      category: 'menu',
      check: (res) => res.status === 200
    },

    {
      name: 'Get Menu Item by ID',
      method: 'GET',
      endpoint: '/api/menu/507f1f77bcf86cd799439011',
      category: 'menu',
      check: (res) => res.status === 200 || res.status === 404
    },

    {
      name: 'Create Menu Item (Admin)',
      method: 'POST',
      endpoint: '/api/menu',
      data: {
        name: 'Test Burger',
        description: 'A delicious test burger',
        price: 9.99,
        category: 'burgers'
      },
      category: 'menu',
      getHeaders: (context) => ({ Authorization: `Bearer ${context.userToken}` }),
      check: (res) => res.status === 201 || res.status === 403,
      notes: 'Will fail if user is not admin'
    },

    {
      name: 'Get Admin Menu Items',
      method: 'GET',
      endpoint: '/api/menu/admin/all',
      category: 'menu',
      getHeaders: (context) => ({ Authorization: `Bearer ${context.userToken}` }),
      check: (res) => res.status === 200 || res.status === 403,
      skipIfFailed: 'Register User'
    },

    // USER MANAGEMENT TESTS
    {
      name: 'Get All Users (Admin)',
      method: 'GET',
      endpoint: '/api/users',
      category: 'users',
      getHeaders: (context) => ({ Authorization: `Bearer ${context.userToken}` }),
      check: (res) => res.status === 200 || res.status === 403,
      skipIfFailed: 'Register User',
      notes: 'Requires admin role'
    },

    {
      name: 'Get User by ID',
      method: 'GET',
      endpoint: '/api/users/507f1f77bcf86cd799439001',
      category: 'users',
      getHeaders: (context) => ({ Authorization: `Bearer ${context.userToken}` }),
      check: (res) => res.status === 200 || res.status === 403 || res.status === 404,
      skipIfFailed: 'Register User'
    },

    {
      name: '404 Handler - Invalid Route',
      method: 'GET',
      endpoint: '/api/nonexistent',
      category: 'health',
      check: (res) => res.status === 404
    }
  ];

  const performTest = async (test, index) => {
    try {
      // Evaluate headers at test time (not definition time) to get latest token
      let headers = test.headers || {};
      if (test.getHeaders) {
        headers = test.getHeaders({ userToken });
      }
      
      const response = await makeRequest(
        test.method,
        test.endpoint,
        test.data,
        headers
      );

      const passed = test.check ? test.check(response) : response.status < 400;
      const status = passed ? '✅' : '❌';
      
      log(`  ${status} [${test.method}] ${test.endpoint}`, passed ? 'green' : 'red');
      
      if (response.status) {
        log(`      Status: ${response.status}`, passed ? 'blue' : 'yellow');
      }
      
      if (response.error) {
        log(`      Error: ${response.error}`, 'red');
      }

      if (test.notes) {
        log(`      📝 ${test.notes}`, 'yellow');
      }

      testResults[test.category][test.name] = {
        passed,
        status: response.status,
        error: response.error
      };

    } catch (err) {
      log(`  ❌ [${test.method}] ${test.endpoint}`, 'red');
      log(`      Error: ${err.message}`, 'red');
      testResults[test.category][test.name] = { passed: false, error: err.message };
    }

    testsCompleted++;
    if (testsCompleted === totalTests) {
      printSummary();
    }
  };

  section('🚀 TESTING API ENDPOINTS');
  
  // Run tests sequentially using async/await
  const runTestsSequentially = async () => {
    for (let i = 0; i < tests.length; i++) {
      await performTest(tests[i], i);
      // Add delay between tests to ensure proper execution
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  };

  // Wait a bit for server to start, then run tests
  setTimeout(runTestsSequentially, 1000);
}

// ─────────────────────────────────────────────────────────────────────
// SUMMARY & RESULTS
// ─────────────────────────────────────────────────────────────────────
function printSummary() {
  setTimeout(() => {
    section('📊 TEST SUMMARY');

    let passed = 0, failed = 0;

    Object.keys(testResults).forEach(category => {
      if (Object.keys(testResults[category]).length === 0) return;
      
      log(`\n${category.toUpperCase()}:`, 'cyan');
      Object.keys(testResults[category]).forEach(test => {
        const result = testResults[category][test];
        if (result.passed) {
          passed++;
          log(`  ✅ ${test}`, 'green');
        } else {
          failed++;
          log(`  ❌ ${test}`, 'red');
          if (result.error) log(`     ${result.error}`, 'yellow');
        }
      });
    });

    section('📈 FINAL RESULTS');
    log(`\nTotal Tests: ${passed + failed}`, 'bright');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`\nSuccess Rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`, passed === passed + failed ? 'green' : 'yellow');

    // Connection info
    log('CONNECTION INFO:', 'cyan');
    log(`MongoDB URI: ${process.env.MONGO_URI}`, 'blue');
    log(`Server Running: http://localhost:${process.env.PORT || 5000}`, 'blue');
    log(`Node Env: ${process.env.NODE_ENV}`, 'blue');

    process.exit(failed > 0 ? 1 : 0);
  }, 500);
}

// Keep process alive for a reasonable time
setTimeout(() => {
  log('\n❌ Tests did not complete in time. Make sure the server is running!', 'red');
  log('Run: cd backend && npm start', 'yellow');
  process.exit(1);
}, 20000);
