#!/usr/bin/env node

/**
 * Detailed MongoDB Menu Checker
 * Shows all menus with complete details
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blaze-kitchen';

mongoose.connect(MONGO_URI)
.then(async () => {
  const db = mongoose.connection.db;
  const menus = db.collection('menus');
  
  // Get all items sorted by category then name
  const items = await menus.find({})
    .sort({ category: 1, name: 1 })
    .toArray();
  
  console.log('\n' + '═'.repeat(100));
  console.log('🔍 DETAILED MONGODB MENU REPORT');
  console.log('═'.repeat(100));
  
  console.log(`\n📊 TOTAL ITEMS: ${items.length}\n`);
  
  // Group by category
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });
  
  // Display each category
  let totalCount = 0;
  Object.keys(grouped).sort().forEach(category => {
    const catItems = grouped[category];
    totalCount += catItems.length;
    
    const icons = {
      'appetizers': '🍟',
      'beverages': '🥤',
      'burgers': '🍔',
      'coffee': '☕',
      'combos': '🍱',
      'desserts': '🍰'
    };
    
    const icon = icons[category] || '🍽️';
    
    console.log(`\n${icon} ${category.toUpperCase()} (${catItems.length} items)`);
    console.log('─'.repeat(100));
    
    catItems.forEach((item, idx) => {
      const num = (idx + 1).toString().padStart(2);
      const name = item.name.padEnd(40);
      const price = `₹${item.price}`.padStart(6);
      const avail = item.availability ? '✅' : '❌';
      const hasImg = item.image ? '📷' : '❌';
      
      console.log(`  ${num}. ${name} ${price}  ${avail} ${hasImg}`);
    });
  });
  
  console.log('\n' + '═'.repeat(100));
  console.log(`\n📈 SUMMARY:\n`);
  
  Object.keys(grouped).sort().forEach(cat => {
    const count = grouped[cat].length;
    const prices = grouped[cat].map(i => i.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const available = grouped[cat].filter(i => i.availability).length;
    
    console.log(`${cat.padEnd(15)} | Items: ${count.toString().padStart(2)} | Price: ₹${minPrice.toString().padStart(4)} - ₹${maxPrice.toString().padStart(4)} | Available: ${available.toString().padStart(2)}`);
  });
  
  console.log(`\n${'TOTAL'.padEnd(15)} | Items: ${totalCount.toString().padStart(2)}`);
  console.log('\n' + '═'.repeat(100) + '\n');
  
  // Check data integrity
  const itemsWithoutName = items.filter(i => !i.name);
  const itemsWithoutPrice = items.filter(i => !i.price);
  const itemsWithoutCategory = items.filter(i => !i.category);
  const itemsWithoutImage = items.filter(i => !i.image);
  
  console.log('✅ DATA INTEGRITY CHECK:\n');
  console.log(`   Items with name: ${items.length - itemsWithoutName.length}/${items.length}`);
  console.log(`   Items with price: ${items.length - itemsWithoutPrice.length}/${items.length}`);
  console.log(`   Items with category: ${items.length - itemsWithoutCategory.length}/${items.length}`);
  console.log(`   Items with image: ${items.length - itemsWithoutImage.length}/${items.length}\n`);
  
  if (itemsWithoutName.length === 0 && itemsWithoutPrice.length === 0 && 
      itemsWithoutCategory.length === 0 && itemsWithoutImage.length === 0) {
    console.log('🎉 ALL DATA IS COMPLETE AND VALID!\n');
  }
  
  process.exit(0);
})
.catch(err => {
  console.log('\n❌ Error:', err.message);
  console.log('\nMake sure MongoDB is running:\n');
  process.exit(1);
});
