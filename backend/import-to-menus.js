/* =============================================
   BLAZE KITCHEN — import-to-menus.js
   Imports the 8-category structured menu data
   from menus_export.json into the "categorymenus"
   collection via the CategoryMenu Mongoose model.
   Run: node backend/import-to-menus.js
   ============================================= */

const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose     = require('mongoose');
const CategoryMenu = require('./models/CategoryMenu.model');

const importMenus = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Read structured export file
    const raw      = fs.readFileSync(path.join(__dirname, 'menus_export.json'), 'utf8');
    const parsed   = JSON.parse(raw);
    const jsonData = parsed.data || parsed;

    if (!Array.isArray(jsonData)) {
      throw new Error('Expected "data" to be an array of category objects');
    }

    // Clear existing category menu data
    await CategoryMenu.deleteMany({});
    console.log('🗑️  Cleared existing category menu data');

    // Insert 8-category structured data
    const created = await CategoryMenu.insertMany(jsonData);
    console.log(`✅ Imported ${created.length} categories into "categorymenus" collection:`);
    created.forEach(c => console.log(`   • ${c.category}`));

    await mongoose.disconnect();
    console.log('\n✅ Import complete!');
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
};

importMenus();
