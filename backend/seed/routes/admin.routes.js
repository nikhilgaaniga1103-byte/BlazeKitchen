/* =============================================
   BLAZE KITCHEN — routes/admin.routes.js
   Admin panel API routes
   ============================================= */

const express = require('express');
const router  = express.Router();

const adminController         = require('../controllers/admin.controller');
const feedbackController      = require('../controllers/feedback.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// All admin routes require authentication + admin role
router.use(protect, restrictTo('admin'));

// Dashboard stats
router.get('/dashboard', adminController.getDashboardStats);

// Users (detailed with order counts)
router.get('/users', adminController.getAllUsersDetailed);

// Orders
router.get('/orders', adminController.getAllOrdersAdmin);

// Menu management
router.get('/menu', adminController.getAllMenuAdmin);
router.patch('/menu/:id/toggle', adminController.toggleMenuAvailability);

// Category Menu management
router.get('/category-menus', adminController.getCategoryMenusAdmin);
router.patch('/category-menus/:id/toggle', adminController.toggleCategoryAvailability);
router.patch('/category-menus/:id/set-availability', adminController.setCategoryAvailability);

// Activity feed
router.get('/activities', adminController.getActivities);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// Sales Summary
router.get('/sales-summary', adminController.getSalesSummary);

// Item reviews
router.get('/reviews', adminController.getItemReviewsAdmin);
router.delete('/reviews/:orderRef/:itemIndex', adminController.deleteItemReviewAdmin);

// Admin login history
router.get('/login-logs', adminController.getLoginLogs);

// Change password
router.put('/change-password', adminController.changePassword);

// Feedback / Contact messages
router.get('/feedback',              feedbackController.getAllFeedbacks);
router.patch('/feedback/:id/status', feedbackController.updateFeedbackStatus);

// Manage admin accounts
router.get('/manage/admins',       adminController.listAdmins);
router.post('/manage/admins',      adminController.createAdmin);
router.put('/manage/admins/:id',   adminController.updateAdmin);
router.delete('/manage/admins/:id', adminController.deleteAdmin);

module.exports = router;
