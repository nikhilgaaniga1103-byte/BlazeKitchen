/* =============================================
   BLAZE KITCHEN — controllers/menu.controller.js
   Nested: Category → Subcategories → Items
   ============================================= */

const Menu = require('../models/Menu.model');
const CategoryMenu = require('../models/CategoryMenu.model');
const sse = require('../sse');

const MENU_CACHE = new Map();
const MENU_CACHE_TTL_MS = 60 * 1000;

function clearMenuCache() {
  MENU_CACHE.clear();
}

function optimizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('images.unsplash.com')) {
    const hasQuery = url.includes('?');
    const joiner = hasQuery ? '&' : '?';
    return `${url}${joiner}auto=format&fit=crop&w=720&q=78`;
  }
  return url;
}

function optimizeMenuDocs(docs) {
  return docs.map(doc => ({
    ...doc,
    subcategories: (doc.subcategories || []).map(sub => ({
      ...sub,
      items: (sub.items || []).map(item => ({
        ...item,
        image_url: optimizeImageUrl(item.image_url)
      }))
    }))
  }));
}

function readCache(key) {
  const hit = MENU_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > MENU_CACHE_TTL_MS) {
    MENU_CACHE.delete(key);
    return null;
  }
  return hit.payload;
}

function writeCache(key, payload) {
  MENU_CACHE.set(key, { at: Date.now(), payload });
}

/* ── Sync helper: mirror Menu doc → CategoryMenu doc (by category name) ── */
async function syncToCategoryMenu(menuDoc) {
  if (!menuDoc) return;
  try {
    let catMenu = await CategoryMenu.findOne({ category: menuDoc.category });

    // Auto-create CategoryMenu doc if it doesn't exist yet
    if (!catMenu) {
      catMenu = new CategoryMenu({
        category: menuDoc.category,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
        badge: '',
        availability: menuDoc.availability !== false
      });
    }

    // Mirror subcategories and items (including availability)
    catMenu.subcategories = menuDoc.subcategories.map(sub => ({
      name: sub.name,
      items: (sub.items || []).map(it => ({
        name: it.name,
        prices: it.prices || [0],
        image_url: it.image_url || '',
        note: it.note || '',
        available: it.available !== false
      }))
    }));
    catMenu.availability = menuDoc.availability;
    await catMenu.save();
  } catch (err) {
    console.error('syncToCategoryMenu error:', err.message);
  }
}

/* ── GET /api/menu — public: all categories ── */
exports.getAllMenuItems = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const cacheKey = JSON.stringify({ filter, page, limit });
    const cached = readCache(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=30');
      return res.json(cached);
    }

    const [items, totalCount] = await Promise.all([
      Menu.find(filter).sort({ category: 1 }).skip(skip).limit(limit).lean(),
      Menu.countDocuments(filter)
    ]);

    const optimized = optimizeMenuDocs(items);
    const payload = {
      success: true,
      count: optimized.length,
      totalCount,
      pagination: { page, limit, hasMore: skip + optimized.length < totalCount },
      data: optimized
    };

    writeCache(cacheKey, payload);
    res.set('Cache-Control', 'public, max-age=30');
    res.json(payload);
  } catch (err) { next(err); }
};

exports.getAllMenus = exports.getAllMenuItems;

/* ── GET /api/menu/admin/all — admin: includes unavailable ── */
exports.getAllMenuItemsAdmin = async (req, res, next) => {
  try {
    const items = await Menu.find({}).sort({ category: 1 });
    res.json({ success: true, count: items.length, data: { items } });
  } catch (err) { next(err); }
};

/* ── GET /api/menu/:id — single category doc ── */
exports.getMenuItemById = async (req, res, next) => {
  try {
    const item = await Menu.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: { item } });
  } catch (err) { next(err); }
};

/* ── POST /api/menu — create new category ── */
exports.createMenuItem = async (req, res, next) => {
  try {
    const { category, subcategories, availability } = req.body;
    const item = await Menu.create({ category, subcategories: subcategories || [], availability });
    await syncToCategoryMenu(item);
    clearMenuCache();
    sse.broadcastAll('menu-updated', { action: 'category-created', category: item.category });
    res.status(201).json({ success: true, message: `"${item.category}" created!`, data: { item } });
  } catch (err) { next(err); }
};

/* ── PUT /api/menu/:id — update entire category doc ── */
exports.updateMenuItem = async (req, res, next) => {
  try {
    const item = await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
    if (!item) return res.status(404).json({ success: false, message: 'Category not found' });
    await syncToCategoryMenu(item);
    clearMenuCache();
    sse.broadcastAll('menu-updated', { action: 'category-updated', category: item.category });
    res.json({ success: true, message: `"${item.category}" updated!`, data: { item } });
  } catch (err) { next(err); }
};

/* ── DELETE /api/menu/:id — delete category doc ── */
exports.deleteMenuItem = async (req, res, next) => {
  try {
    const item = await Menu.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Category not found' });
    // Also remove the mirrored CategoryMenu doc so it disappears from frontend
    await CategoryMenu.deleteOne({ category: item.category });
    clearMenuCache();
    sse.broadcastAll('menu-updated', { action: 'category-deleted', category: item.category });
    res.json({ success: true, message: `"${item.category}" deleted.` });
  } catch (err) { next(err); }
};

/* ──────── NESTED CRUD — Subcategory / Item level ──────── */

/* POST /api/menu/:id/subcategory — add subcategory */
exports.addSubcategory = async (req, res, next) => {
  try {
    const doc = await Menu.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Category not found' });
    doc.subcategories.push({ name: req.body.name, items: [] });
    await doc.save();
    await syncToCategoryMenu(doc);
    clearMenuCache();
    sse.broadcastAll('menu-updated', { action: 'subcategory-added', category: doc.category });
    res.status(201).json({ success: true, message: `Subcategory "${req.body.name}" added!`, data: { item: doc } });
  } catch (err) { next(err); }
};

/* PUT /api/menu/:id/subcategory/:subIdx — rename subcategory */
exports.updateSubcategory = async (req, res, next) => {
  try {
    const doc = await Menu.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Category not found' });
    const sub = doc.subcategories[req.params.subIdx];
    if (!sub) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    if (req.body.name) sub.name = req.body.name;
    await doc.save();
    await syncToCategoryMenu(doc);
    clearMenuCache();
    sse.broadcastAll('menu-updated', { action: 'subcategory-updated', category: doc.category });
    res.json({ success: true, message: 'Subcategory updated!', data: { item: doc } });
  } catch (err) { next(err); }
};

/* DELETE /api/menu/:id/subcategory/:subIdx — delete subcategory */
exports.deleteSubcategory = async (req, res, next) => {
  try {
    const doc = await Menu.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Category not found' });
    doc.subcategories.splice(Number(req.params.subIdx), 1);
    await doc.save();
    await syncToCategoryMenu(doc);
    clearMenuCache();
    sse.broadcastAll('menu-updated', { action: 'subcategory-deleted', category: doc.category });
    res.json({ success: true, message: 'Subcategory deleted!', data: { item: doc } });
  } catch (err) { next(err); }
};

/* POST /api/menu/:id/subcategory/:subIdx/item — add item */
exports.addItem = async (req, res, next) => {
  try {
    const doc = await Menu.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Category not found' });
    const sub = doc.subcategories[req.params.subIdx];
    if (!sub) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    const { name, prices, image_url, available } = req.body;
    sub.items.push({ name, prices: prices || [0], image_url: image_url || '', available: available !== false });
    await doc.save();
    await syncToCategoryMenu(doc);
    clearMenuCache();
    sse.broadcastAll('menu-updated', { action: 'item-added', category: doc.category });
    res.status(201).json({ success: true, message: `"${name}" added!`, data: { item: doc } });
  } catch (err) { next(err); }
};

/* PUT /api/menu/:id/subcategory/:subIdx/item/:itemIdx — update item */
exports.updateItem = async (req, res, next) => {
  try {
    const doc = await Menu.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Category not found' });
    const sub = doc.subcategories[req.params.subIdx];
    if (!sub) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    const it = sub.items[req.params.itemIdx];
    if (!it) return res.status(404).json({ success: false, message: 'Item not found' });
    if (req.body.name !== undefined)      it.name      = req.body.name;
    if (req.body.prices !== undefined)    it.prices    = req.body.prices;
    if (req.body.image_url !== undefined) it.image_url = req.body.image_url;
    if (req.body.available !== undefined) it.available  = req.body.available;
    await doc.save();
    await syncToCategoryMenu(doc);
    clearMenuCache();
    sse.broadcastAll('menu-updated', { action: 'item-updated', category: doc.category });
    res.json({ success: true, message: `"${it.name}" updated!`, data: { item: doc } });
  } catch (err) { next(err); }
};

/* DELETE /api/menu/:id/subcategory/:subIdx/item/:itemIdx — delete item */
exports.deleteItem = async (req, res, next) => {
  try {
    const doc = await Menu.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Category not found' });
    const sub = doc.subcategories[req.params.subIdx];
    if (!sub) return res.status(404).json({ success: false, message: 'Subcategory not found' });
    const removed = sub.items.splice(Number(req.params.itemIdx), 1);
    await doc.save();
    await syncToCategoryMenu(doc);
    clearMenuCache();
    sse.broadcastAll('menu-updated', { action: 'item-deleted', category: doc.category });
    res.json({ success: true, message: `"${removed[0]?.name || 'Item'}" deleted!`, data: { item: doc } });
  } catch (err) { next(err); }
};

/* ── POST /api/menu/resync — force re-sync all Menu docs to CategoryMenu ── */
exports.resyncAll = async (req, res, next) => {
  try {
    const allMenus = await Menu.find({});
    let synced = 0;
    for (const doc of allMenus) {
      await syncToCategoryMenu(doc);
      synced++;
    }
    clearMenuCache();
    sse.broadcastAll('menu-updated', { action: 'resync', count: synced });
    res.json({ success: true, message: `Re-synced ${synced} categories` });
  } catch (err) { next(err); }
};
