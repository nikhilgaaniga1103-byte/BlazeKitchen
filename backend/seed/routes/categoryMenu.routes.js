/* =============================================
   BLAZE KITCHEN — routes/categoryMenu.routes.js
   Routes for the structured 8-category menu
   ============================================= */

const express = require('express');
const router  = express.Router();

const categoryMenuController  = require('../controllers/categoryMenu.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// ── Public Routes ──
// GET /api/menus          — all categories with subcategories
router.get('/', categoryMenuController.getAllCategoryMenus);

// GET /api/menus/:id      — single category by ID
router.get('/:id', categoryMenuController.getCategoryMenuById);

// ── Admin Protected Routes ──
// POST /api/menus         — create new category
router.post('/',
  protect, restrictTo('admin'),
  categoryMenuController.createCategoryMenu
);

// PUT /api/menus/:id      — update category
router.put('/:id',
  protect, restrictTo('admin'),
  categoryMenuController.updateCategoryMenu
);

// DELETE /api/menus/:id   — delete category
router.delete('/:id',
  protect, restrictTo('admin'),
  categoryMenuController.deleteCategoryMenu
);

module.exports = router;
