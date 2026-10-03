/* =============================================
   BLAZE KITCHEN — routes/order.routes.js
   ============================================= */

const express = require('express');
const router  = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  approveOrder,
  rejectOrder,
  approveCancelRequest,
  rejectCancelRequest,
  markNotificationRead,
  getOrderTracking,
  requestRefund,
  approveRefund,
  rejectRefund,
  processRefund,
  submitItemReview,
  confirmDeliveredFromTracking,
  sendOrderWhatsAppNotification
} = require('../controllers/order.controller');

// All order routes require authentication
router.use(protect);

// Admin routes (must come before :orderId param routes)
router.get('/admin/all',           restrictTo('admin'), getAllOrders);

// Customer routes
router.post('/',                                    createOrder);
router.get('/',                                     getMyOrders);
router.get('/:orderId/tracking',                   getOrderTracking);
router.get('/:orderId',                            getOrder);
router.patch('/:orderId/cancel',                    cancelOrder);
router.patch('/:orderId/notification/read',         markNotificationRead);
router.patch('/:orderId/refund/request',            requestRefund);
router.patch('/:orderId/items/:itemIdx/review',     submitItemReview);
router.patch('/:orderId/delivered/confirm',         confirmDeliveredFromTracking);

// Admin status update
router.patch('/:orderId/status',                    restrictTo('admin'), updateOrderStatus);
router.patch('/:orderId/approve',                   restrictTo('admin'), approveOrder);
router.patch('/:orderId/reject',                    restrictTo('admin'), rejectOrder);
router.patch('/:orderId/cancel-request/approve',    restrictTo('admin'), approveCancelRequest);
router.patch('/:orderId/cancel-request/reject',     restrictTo('admin'), rejectCancelRequest);
router.patch('/:orderId/refund/approve',            restrictTo('admin'), approveRefund);
router.patch('/:orderId/refund/reject',             restrictTo('admin'), rejectRefund);
router.patch('/:orderId/refund/process',            restrictTo('admin'), processRefund);
router.post('/:orderId/notify-whatsapp',            restrictTo('admin'), sendOrderWhatsAppNotification);

module.exports = router;
