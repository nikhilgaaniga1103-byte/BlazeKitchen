/* =============================================
   BLAZE KITCHEN — import-menu-data.js
   Imports the canonical structured menu from
   "menus_export.json" into BOTH collections so the
   admin panel and the customer site stay in sync:

     • menus         (Menu model)         -> admin "Menu Items" + public /api/menu
     • categorymenus (CategoryMenu model) -> admin "Menu"       + public /api/menus

   Run: npm run import:menu-data
   ============================================= */

const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose     = require('mongoose');
const Menu         = require('./models/Menu.model');
const CategoryMenu = require('./models/CategoryMenu.model');

const DEFAULT_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80';

/* Normalise one exported category into the nested shape both models expect:
   category -> subcategories[] -> items[] { name, prices[], image_url, note } */
function normalizeCategory(cat) {
  return {
    category    : cat.category,
    image       : cat.image || DEFAULT_CATEGORY_IMAGE,
    badge       : cat.badge || '',
    availability: cat.availability !== false,
    subcategories: (cat.subcategories || []).map(sub => ({
      name : sub.name,
      items: (sub.items || []).map(it => ({
        name     : it.name,
        prices   : Array.isArray(it.prices) && it.prices.length ? it.prices : [0],
        image_url: it.image_url || '',
        note     : it.note || '',
        available: it.available !== false
      }))
    }))
  };
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // ── Load canonical export (strip UTF-8 BOM if present) ──
    const raw    = fs.readFileSync(path.join(__dirname, 'menus_export.json'), 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    const cats   = parsed.data || parsed;

    if (!Array.isArray(cats)) {
      throw new Error('Expected "data" to be an array of category objects in menus_export.json');
    }

    const docs = cats.map(normalizeCategory);

    // ── 1) menus collection (nested Menu docs) ──
    await Menu.deleteMany({});
    const menuDocs = await Menu.insertMany(docs);
    console.log(`🗑️  Cleared "menus" → inserted ${menuDocs.length} categories`);

    // ── 2) categorymenus collection (structured CategoryMenu docs) ──
    // Preserve the original _ids from the export when valid so existing
    // frontend/admin links keep working.
    const catPayload = cats.map((orig, i) => {
      const doc = { ...docs[i] };
      if (orig._id && mongoose.isValidObjectId(orig._id)) doc._id = orig._id;
      return doc;
    });

    await CategoryMenu.deleteMany({});
    const catDocs = await CategoryMenu.insertMany(catPayload);
    console.log(`🗑️  Cleared "categorymenus" → inserted ${catDocs.length} categories`);

    // ── Summary ──
    let subs = 0, items = 0;
    docs.forEach(d => {
      subs += d.subcategories.length;
      d.subcategories.forEach(s => { items += s.items.length; });
    });

    console.log('\n📊 Imported menu:');
    console.log(`   Categories    : ${docs.length}`);
    console.log(`   Subcategories : ${subs}`);
    console.log(`   Items         : ${items}\n`);
    docs.forEach(d => {
      const n = d.subcategories.reduce((a, s) => a + s.items.length, 0);
      console.log(`   • ${d.category.padEnd(26)} ${String(d.subcategories.length).padStart(2)} subcats, ${String(n).padStart(3)} items`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Menu data imported successfully (menus + categorymenus)!');
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  }
};

run();
