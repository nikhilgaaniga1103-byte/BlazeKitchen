/* =============================================
   BLAZE KITCHEN — routes/menu.routes.js
   Nested: Category → Subcategories → Items
   ============================================= */

const express = require('express');
const router  = express.Router();
const mc      = require('../controllers/menu.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const admin = [protect, restrictTo('admin')];

// ── Public ──
router.get('/',    mc.getAllMenuItems);

// ── Admin: category level (must be before /:id to avoid matching 'admin' as id) ──
router.get('/admin/all', ...admin, mc.getAllMenuItemsAdmin);
router.post('/resync',   ...admin, mc.resyncAll);
router.post('/',         ...admin, mc.createMenuItem);

router.get('/:id', mc.getMenuItemById);
router.put('/:id',       ...admin, mc.updateMenuItem);
router.delete('/:id',    ...admin, mc.deleteMenuItem);

// ── Admin: subcategory level ──
router.post('/:id/subcategory',            ...admin, mc.addSubcategory);
router.put('/:id/subcategory/:subIdx',     ...admin, mc.updateSubcategory);
router.delete('/:id/subcategory/:subIdx',  ...admin, mc.deleteSubcategory);

// ── Admin: item level ──
router.post('/:id/subcategory/:subIdx/item',             ...admin, mc.addItem);
router.put('/:id/subcategory/:subIdx/item/:itemIdx',     ...admin, mc.updateItem);
router.delete('/:id/subcategory/:subIdx/item/:itemIdx',  ...admin, mc.deleteItem);

module.exports = router;
