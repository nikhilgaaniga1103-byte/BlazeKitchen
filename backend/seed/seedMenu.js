/* =============================================
   BLAZE KITCHEN — Database Seeding Script
   Run: node backend/seed/seedMenu.js
   ============================================= */

const mongoose = require('mongoose');
require('dotenv').config();

const Menu = require('../models/Menu.model');
const sampleMenuItems = require('./sampleMenuData');

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Check existing items
    const existingCount = await Menu.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠️  Found ${existingCount} existing menu items`);
      console.log('❌ Run: db.menus.deleteMany({}) to clear first');
      console.log('Or update this script to use insertMany({ ordered: false })\n');
      process.exit(0);
    }

    // Insert sample items
    const insertedItems = await Menu.insertMany(sampleMenuItems);
    
    console.log(`\n✨ Successfully seeded ${insertedItems.length} menu items!\n`);
    
    // Show summary
    const categories = {};
    insertedItems.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + 1;
    });

    console.log('📊 Items by Category:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   ${cat.toUpperCase()}: ${count} items`);
    });

    console.log('\n✅ Database seeding complete!');
    console.log('📺 Open admin.html to see the items in the dashboard\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
