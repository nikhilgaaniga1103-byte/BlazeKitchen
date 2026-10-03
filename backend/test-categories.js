#!/usr/bin/env node

/**
 * 🔥 Blaze Kitchen - Category Filter Debugging
 * Tests if category filtering works on frontend and backend
 */

const http = require('http');

console.log('\n' + '='.repeat(70));
console.log('🔥 BLAZE KITCHEN - CATEGORY FILTER TEST');
console.log('='.repeat(70) + '\n');

const categories = ['all', 'burgers', 'beverages', 'desserts', 'coffee', 'appetizers', 'combos'];

let completed = 0;
let results = {};

categories.forEach(category => {
  const query = category === 'all' ? '?limit=200' : `?category=${category}`;
  const url = `http://localhost:5000/api/menu${query}`;
  
  http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        const count = response.data?.items?.length || 0;
        const items = response.data?.items || [];
        
        // Get unique categories in response
        const itemCategories = new Set(items.map(i => i.category).filter(Boolean));
        
        results[category] = {
          count,
          categories: Array.from(itemCategories),
          status: count > 0 ? '✅' : '❌'
        };
        
      } catch (e) {
        results[category] = { error: e.message, status: '❌' };
      }
      completed++;
      if (completed === categories.length) showResults();
    });
  }).on('error', err => {
    results[category] = { error: err.message, status: '❌' };
    completed++;
    if (completed === categories.length) showResults();
  });
});

function showResults() {
  console.log('📊 TEST RESULTS');
  console.log('-'.repeat(70));
  
  categories.forEach(cat => {
    const result = results[cat];
    if (result.error) {
      console.log(`${result.status} ${cat.toUpperCase()}: Error - ${result.error}`);
    } else {
      console.log(`${result.status} ${cat.toUpperCase().padEnd(15)}: ${result.count} items | Categories: ${result.categories.join(', ')}`);
    }
  });
  
  console.log('\n📋 DETAILED BREAKDOWN');
  console.log('-'.repeat(70));
  
  // Summary for 'all'
  if (results.all && !results.all.error) {
    console.log(`Total items in database: ${results.all.count}`);
    console.log(`Categories found: ${results.all.categories.join(', ')}`);
  }
  
  console.log('\n✅ FILTERING TEST SUMMARY');
  console.log('-'.repeat(70));
  
  let allPassed = true;
  categories.slice(1).forEach(cat => {
    const result = results[cat];
    if (result.error) {
      console.log(`❌ ${cat}: API Error`);
      allPassed = false;
    } else if (result.count === 0) {
      console.log(`❌ ${cat}: No items returned`);
      allPassed = false;
    } else if (!result.categories.includes(cat)) {
      console.log(`⚠️  ${cat}: Filter may not be working (got: ${result.categories.join(', ')})`);
      allPassed = false;
    } else {
      console.log(`✅ ${cat}: Filter working correctly (${result.count} items)`);
    }
  });
  
  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log('✅ All category filters are working correctly!');
  } else {
    console.log('⚠️  Some category filters may have issues. Check above.');
  }
  console.log('='.repeat(70) + '\n');
  
  console.log('🔧 FRONTEND RECOMMENDATIONS');
  console.log('-'.repeat(70));
  console.log('1. Clear browser cache: Ctrl+Shift+Delete');
  console.log('2. Hard refresh page: Ctrl+Shift+R');
  console.log('3. Open Developer Tools (F12) → Console');
  console.log('4. Check for JavaScript errors');
  console.log('5. Click category buttons and verify filtering');
  console.log('6. Check Network tab to see API requests\n');
}
