#!/usr/bin/env node

/**
 * Check MongoDB Menu Data
 * See what categories and items exist in the database
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blaze-kitchen';

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 5000
})
.then(async () => {
  console.log('\n✅ MongoDB Connected\n');
  
  // Check Menu collection
  const db = mongoose.connection.db;
  
  // Get all collections
  const collections = await db.listCollections().toArray();
  console.log('📊 Collections in database:');
  collections.forEach(col => {
    console.log(`   • ${col.name}`);
  });
  
  // Check Menu/Menus collection
  const menuCollection = collections.find(c => c.name === 'menus');
  
  if (!menuCollection) {
    console.log('\n⚠️  No "menus" collection found');
    console.log('   Available: Menu, menu, etc.\n');
  } else {
    console.log('\n📋 Menu Items in Database:\n');
    
    const menus = db.collection('menus');
    const count = await menus.countDocuments();
    console.log(`Total items: ${count}\n`);
    
    if (count === 0) {
      console.log('⚠️  No menu items in database!');
      console.log('   Run: npm run seed\n');
    } else {
      // Get categories
      const items = await menus.find({}).toArray();
      const categories = [...new Set(items.map(i => i.category))];
      
      console.log(`📂 Categories (${categories.length}):`);
      categories.forEach(cat => {
        const catItems = items.filter(i => i.category === cat);
        console.log(`   • ${cat}: ${catItems.length} items`);
      });
      
      // Show sample items
      console.log('\n📦 Sample Items:\n');
      categories.slice(0, 3).forEach(cat => {
        const sample = items.find(i => i.category === cat);
        console.log(`${cat}:`);
        console.log(`   Name: ${sample.name}`);
        console.log(`   Price: ₹${sample.price}`);
        console.log(`   Category: ${sample.category}`);
        console.log(`   Available: ${sample.availability}`);
        console.log('');
      });
    }
  }
  
  process.exit(0);
})
.catch(err => {
  console.log('\n❌ MongoDB Connection Error:', err.message);
  console.log('\nMake sure:');
  console.log('1. MongoDB is running: mongod');
  console.log('2. .env has correct MONGO_URI');
  console.log('3. Database seeded: npm run seed\n');
  process.exit(1);
});
