#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blaze-kitchen';

mongoose.connect(MONGO_URI)
.then(async () => {
  const db = mongoose.connection.db;
  const menus = db.collection('menus');
  
  const items = await menus.find({}).toArray();
  
  console.log('\n═══════════════════════════════════════════');
  console.log('DATABASE ITEMS');
  console.log('═══════════════════════════════════════════\n');
  console.log(`Total Items: ${items.length}\n`);
  
  items.forEach((item, idx) => {
    const name = item.name || 'N/A';
    const price = item.price || 'N/A';
    const cat = item.category || 'N/A';
    const avail = item.availability ? 'YES' : 'NO';
    console.log(`${idx + 1}. ${name} | ₹${price} | ${cat} | ${avail}`);
  });
  
  console.log('\n═══════════════════════════════════════════\n');
  process.exit(0);
})
.catch(err => {
  console.log('Connection Error:', err.message);
  process.exit(1);
});
