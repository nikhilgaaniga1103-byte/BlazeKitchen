#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blaze-kitchen';

mongoose.connect(MONGO_URI)
.then(async () => {
  const db = mongoose.connection.db;
  const menus = db.collection('menus');
  
  const items = await menus.find({}).toArray();
  
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('📊 DATABASE DATA SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Total Documents: ${items.length}\n`);
  
  items.forEach((doc, idx) => {
    console.log(`\n📄 Document ${idx + 1}:`);
    console.log(`   _id: ${doc._id}`);
    console.log(`   Name: ${doc.name || 'N/A'}`);
    console.log(`   Category: ${doc.category || 'N/A'}`);
    console.log(`   Type: Category Object - ${Object.keys(doc).join(', ')}`);
    
    if (doc.items) {
      console.log(`   Items in this doc: ${doc.items.length}`);
      doc.items.forEach((item, i) => {
        if (i < 3) {
          console.log(`      • ${item.name} - ₹${item.prices ? item.prices[0] : 'N/A'}`);
        }
      });
      if (doc.items.length > 3) {
        console.log(`      ... and ${doc.items.length - 3} more`);
      }
    }
  });
  
  console.log('\n' + '═'.repeat(73) + '\n');
  
  process.exit(0);
})
.catch(err => {
  console.log('Error:', err.message);
  process.exit(1);
});
