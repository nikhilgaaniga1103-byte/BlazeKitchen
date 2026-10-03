const { MongoClient } = require('mongodb');
const axios = require('axios');

const importMenus = async () => {
  const uri = 'mongodb://localhost:27017/cloudkitchen';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('cloudkitchen');
    const menusCollection = db.collection('menus');

    // Fetch menu data from API
    const response = await axios.get('http://localhost:5000/api/menu?limit=200');
    let menuItems = response.data.data.items;
    
    // Ensure it's an array
    if (!Array.isArray(menuItems)) {
      menuItems = [menuItems];
    }

    // Clear existing data
    await menusCollection.deleteMany({});
    console.log('🗑️ Cleared existing menus');

    // Insert all menu items
    const result = await menusCollection.insertMany(menuItems);
    console.log(`✅ Imported ${result.insertedIds.length} menu items`);

    // Verify
    const count = await menusCollection.countDocuments();
    console.log(`📊 Total in menus collection: ${count}`);

    // Show category breakdown
    const pipeline = [
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ];
    const breakdown = await menusCollection.aggregate(pipeline).toArray();
    console.log('\n📈 Menu breakdown by category:');
    breakdown.forEach(cat => {
      console.log(`  ${cat._id}: ${cat.count} items`);
    });

    await client.close();
    console.log('\n✅ Import complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

importMenus();
