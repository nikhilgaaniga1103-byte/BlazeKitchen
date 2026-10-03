/* =============================================
   BLAZE KITCHEN — routes/mood.routes.js
   Mood recommendation and admin mood management
   ============================================= */

const express = require('express');
const router = express.Router();

const moodController = require('../controllers/mood.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const admin = [protect, restrictTo('admin')];

// Public APIs
router.get('/categories', moodController.getPublicMoodCategories);
router.get('/recommendations', moodController.getMoodRecommendations);
router.post('/recommendations', moodController.getMoodRecommendations);

// Admin APIs — category controls
router.get('/admin/categories', ...admin, moodController.getAdminMoodCategories);
router.put('/admin/categories/:slug', ...admin, moodController.updateAdminMoodCategory);

// Admin APIs — item mapping controls
router.get('/admin/menu-items', ...admin, moodController.getAdminMenuItems);
router.get('/admin/items', ...admin, moodController.getAdminMoodItems);
router.post('/admin/items', ...admin, moodController.createAdminMoodItem);
router.put('/admin/items/:id', ...admin, moodController.updateAdminMoodItem);
router.patch('/admin/items/:id/toggle', ...admin, moodController.toggleAdminMoodItem);
router.delete('/admin/items/:id', ...admin, moodController.deleteAdminMoodItem);

module.exports = router;
