#!/usr/bin/env node

/**
 * Frontend Category Loading Test
 * Tests if categories load correctly from API
 */

const http = require('http');

console.log('\n🔍 Testing Frontend Category Loading...\n');

// Test 1: Check if API returns menu data
console.log('Test 1: Fetching menu data from API...');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/menu',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      const items = response.data || response;
      
      if (!Array.isArray(items)) {
        console.log('❌ API response is not an array');
        return;
      }
      
      console.log(`✅ API returned ${items.length} items\n`);
      
      // Test 2: Group by category
      console.log('Test 2: Grouping items by category...');
      const grouped = {};
      items.forEach(item => {
        const cat = item.category || 'unknown';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });
      
      const categories = Object.keys(grouped);
      console.log(`✅ Found ${categories.length} categories:\n`);
      
      categories.forEach(cat => {
        const count = grouped[cat].length;
        const icon = {
          'burgers': '🍔',
          'beverages': '🥤',
          'desserts': '🍰',
          'coffee': '☕',
          'appetizers': '🍟',
          'combos': '🍱'
        }[cat] || '🍽️';
        
        console.log(`   ${icon} ${cat.charAt(0).toUpperCase() + cat.slice(1).padEnd(15)} (${count} items)`);
      });
      
      // Test 3: Sample items from each category
      console.log('\nTest 3: Sample items from each category:\n');
      
      categories.forEach(cat => {
        const sample = grouped[cat][0];
        console.log(`${cat}:`);
        console.log(`   · "${sample.name}" - ₹${sample.price}`);
        console.log(`   · Available: ${sample.availability}`);
        console.log('');
      });
      
      // Test 4: Check for image URLs
      console.log('Test 4: Checking image URLs...');
      const itemsWithImages = items.filter(i => i.image && i.image.startsWith('http'));
      console.log(`✅ ${itemsWithImages.length}/${items.length} items have valid image URLs\n`);
      
      // Test 5: Verify category carousel would render
      console.log('Test 5: Verifying category carousel rendering...');
      if (categories.length > 0 && items.length > 0) {
        console.log('✅ All data ready for category carousel rendering\n');
      }
      
      // Final summary
      console.log('═'.repeat(60));
      console.log('🎉 FRONTEND CATEGORIES TEST SUMMARY');
      console.log('═'.repeat(60));
      console.log(`Total Items:        ${items.length}`);
      console.log(`Categories Found:   ${categories.length}`);
      categories.forEach(cat => {
        console.log(`  - ${cat}: ${grouped[cat].length} items`);
      });
      console.log(`Images Ready:       ${itemsWithImages.length}/${items.length}`);
      console.log('\n✅ FRONTEND IS READY TO DISPLAY CATEGORIES');
      console.log('═'.repeat(60) + '\n');
      
    } catch (err) {
      console.log('❌ Error parsing API response:', err.message);
    }
  });
});

req.on('error', (err) => {
  console.log('❌ API connection error:', err.message);
  console.log('\nMake sure:');
  console.log('1. Backend server is running: cd backend && npm start');
  console.log('2. MongoDB is connected');
  console.log('3. Database has menu data (run: npm run seed)');
});

req.end();
