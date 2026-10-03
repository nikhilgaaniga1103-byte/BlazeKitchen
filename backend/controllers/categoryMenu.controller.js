/* =============================================
   BLAZE KITCHEN — controllers/categoryMenu.controller.js
   Serves the structured 8-category menu
   ============================================= */

const CategoryMenu = require('../models/CategoryMenu.model');

/**
 * @route   GET /api/menus
 * @access  Public
 * Returns all categories with subcategories and items
 */
exports.getAllCategoryMenus = async (req, res, next) => {
  try {
    const categories = await CategoryMenu.find({ availability: true }).sort({ createdAt: 1 }).lean();

    // Filter out unavailable items from each subcategory
    categories.forEach(cat => {
      if (cat.subcategories) {
        cat.subcategories.forEach(sub => {
          if (sub.items) {
            sub.items = sub.items.filter(item => item.available !== false);
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      count  : categories.length,
      data   : categories
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/menus/:id
 * @access  Public
 * Returns a single category by ID
 */
exports.getCategoryMenuById = async (req, res, next) => {
  try {
    const category = await CategoryMenu.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/menus
 * @access  Admin only
 * Create a new category with subcategories
 */
exports.createCategoryMenu = async (req, res, next) => {
  try {
    const category = await CategoryMenu.create(req.body);
    res.status(201).json({
      success: true,
      message: `Category "${category.category}" created!`,
      data   : category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/menus/:id
 * @access  Admin only
 * Update a category
 */
exports.updateCategoryMenu = async (req, res, next) => {
  try {
    const category = await CategoryMenu.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({
      success: true,
      message: `Category "${category.category}" updated!`,
      data   : category
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/menus/:id
 * @access  Admin only
 * Delete a category
 */
exports.deleteCategoryMenu = async (req, res, next) => {
  try {
    const category = await CategoryMenu.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({
      success: true,
      message: `Category "${category.category}" deleted!`
    });
  } catch (err) {
    next(err);
  }
};
