#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blaze-kitchen';

mongoose.connect(MONGO_URI)
.then(async () => {
  const db = mongoose.connection.db;
  const menus = db.collection('menus');
  
  const categories = await menus.find({}).toArray();
  
  console.log('\n' + '═'.repeat(100));
  console.log('📊 COMPLETE DATABASE DATA');
  console.log('═'.repeat(100) + '\n');
  
  let totalItems = 0;
  
  categories.forEach((cat, catIdx) => {
    console.log(`\n${'═'.repeat(100)}`);
    console.log(`📂 CATEGORY ${catIdx + 1}: ${cat.category}`);
    console.log('═'.repeat(100) + '\n');
    
    if (cat.subcategories && cat.subcategories.length > 0) {
      cat.subcategories.forEach((subcat, scIdx) => {
        console.log(`   🏷️  ${subcat.name} (${subcat.items ? subcat.items.length : 0} items)`);
        
        if (subcat.items && subcat.items.length > 0) {
          subcat.items.forEach((item, itemIdx) => {
            const price = item.prices && item.prices[0] ? item.prices[0] : 'N/A';
            console.log(`      ${(itemIdx + 1).toString().padStart(2)}. ${item.name.padEnd(45)} ₹${price.toString().padStart(5)}`);
            totalItems++;
          });
        }
      });
    }
  });
  
  console.log('\n' + '═'.repeat(100));
  console.log(`\n✅ TOTAL ITEMS IN DATABASE: ${totalItems}`);
  console.log(`✅ TOTAL CATEGORIES: ${categories.length}\n`);
  console.log('═'.repeat(100) + '\n');
  
  process.exit(0);
})
.catch(err => {
  console.log('Error:', err.message);
  process.exit(1);
});
