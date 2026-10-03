#!/usr/bin/env node

/**
 * Simple MongoDB Data Viewer
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blaze-kitchen';

mongoose.connect(MONGO_URI)
.then(async () => {
  const db = mongoose.connection.db;
  const menus = db.collection('menus');
  
  const items = await menus.find({}).toArray();
  
  console.log('\n' + '═'.repeat(100));
  console.log('📊 DATABASE MENU DATA');
  console.log('═'.repeat(100));
  console.log(`\n✅ Total Items: ${items.length}\n`);
  
  if (items.length === 0) {
    console.log('⚠️  No items found in database!');
    process.exit(0);
  }
  
  // Display all items
  items.forEach((item, idx) => {
    console.log(`${(idx + 1).toString().padStart(3)}. ${item.name.padEnd(40)} | ₹${item.price.toString().padStart(5)} | ${item.category.padEnd(12)} | ${item.availability ? '✅' : '❌'}`);
  });
  
  console.log('\n' + '═'.repeat(100));
  
  // Summary by category
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = 0;
    grouped[item.category]++;
  });
  
  console.log('\n📂 CATEGORIES:\n');
  Object.keys(grouped).sort().forEach(cat => {
    console.log(`   ${cat.padEnd(15)}: ${grouped[cat]} items`);
  });
  
  console.log('\n' + '═'.repeat(100) + '\n');
  process.exit(0);
})
.catch(err => {
  console.log('\n❌ Error:', err.message);
  console.log('\nMake sure MongoDB is running on localhost:27017');
  process.exit(1);
});
