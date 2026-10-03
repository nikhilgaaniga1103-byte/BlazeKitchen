#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blaze-kitchen';

mongoose.connect(MONGO_URI)
.then(async () => {
  const db = mongoose.connection.db;
  
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('MONGODB DATABASE INSPECTION');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  // Get all collections
  const collections = await db.listCollections().toArray();
  console.log(`📂 Collections in database: ${collections.length}\n`);
  collections.forEach(col => {
    console.log(`   • ${col.name}`);
  });
  
  // Count documents in each collection
  console.log('\n📊 Document Count:\n');
  for (const col of collections) {
    const collection = db.collection(col.name);
    const count = await collection.countDocuments();
    console.log(`   ${col.name}: ${count} documents`);
  }
  
  // Show menus collection details
  console.log('\n' + '═'.repeat(73));
  console.log('🔍 MENUS COLLECTION DETAILS');
  console.log('═'.repeat(73) + '\n');
  
  const menus = db.collection('menus');
  const items = await menus.find({}).limit(10).toArray();
  
  console.log(`First 10 items:\n`);
  items.forEach((item, idx) => {
    console.log(`${idx + 1}. ${JSON.stringify(item, null, 2)}\n`);
  });
  
  process.exit(0);
})
.catch(err => {
  console.log('Error:', err.message);
  process.exit(1);
});
