/* =============================================
   BLAZE KITCHEN — routes/settings.routes.js
   Public GET + Admin-only PUT for site settings
   ============================================= */

const express = require('express');
const router  = express.Router();

const settingsController      = require('../controllers/settings.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Public — frontend fetches contact info
router.get('/', settingsController.getSettings);

// Admin only — update settings
router.put('/', protect, restrictTo('admin'), settingsController.updateSettings);

module.exports = router;
