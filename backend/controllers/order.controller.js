/* =============================================
   BLAZE KITCHEN — controllers/order.controller.js
   ============================================= */

const Order = require('../models/Order.model');
const CategoryMenu = require('../models/CategoryMenu.model');
const SiteSettings = require('../models/SiteSettings.model');
const sse   = require('../sse');
const { sendWhatsAppMessage } = require('../services/whatsapp.service');

const CGST_RATE = 0.025;
const SGST_RATE = 0.025;
const PACKAGING_RATE = 0.07;
const VALID_COUPONS = {
  BLAZE50: 50,
  FIRST100: 100,
  MIDNIGHT: 80,
  VIP200: 200,
  WELCOME: 120
};

const STATUS_PROGRESS = {
  placed: 5,
  confirmed: 20,
  preparing: 50,
  out_for_delivery: 80,
  delivered: 100,
  cancelled: 0
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toMoney(n) {
  return Math.round(Number(n) || 0);
}

function normalizeCookingInstructions(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.slice(0, 300);
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function priceMatches(allowedPrices, submittedPrice) {
  if (!Array.isArray(allowedPrices)) return false;
  return allowedPrices.some(p => Math.abs(Number(p) - Number(submittedPrice)) < 0.01);
}

async function buildTrustedItemsAndSubtotal(rawItems) {
  const menus = await CategoryMenu.find({ availability: true }).lean();
  const catalog = [];

  for (const cat of menus) {
    const subcats = Array.isArray(cat.subcategories) ? cat.subcategories : [];
    for (const sub of subcats) {
      const entries = Array.isArray(sub.items) ? sub.items : [];
      for (const item of entries) {
        if (item?.available === false) continue;
        catalog.push(item);
      }
    }
  }

  const trustedItems = [];
  let subtotal = 0;

  for (const it of rawItems) {
    const name = String(it?.name || '').trim();
    const requestedPrice = Number(it?.price);
    const quantity = Number(it?.quantity);

    if (!name || !isFiniteNumber(requestedPrice) || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Invalid item payload in order');
    }

    const normalizedName = name.toLowerCase();
    const matched = catalog.find(menuItem =>
      String(menuItem?.name || '').trim().toLowerCase() === normalizedName
      && priceMatches(menuItem.prices, requestedPrice)
    );

    if (!matched) {
      throw new Error(`Price validation failed for item "${name}"`);
    }

    const unitPrice = toMoney(requestedPrice);
    trustedItems.push({
      name: matched.name,
      price: unitPrice,
      quantity,
      image: matched.image_url || it?.image || ''
    });
    subtotal += unitPrice * quantity;
  }

  return { trustedItems, subtotal: toMoney(subtotal) };
}

function pushRefundHistory(order, status, note, actor = 'system', amount = 0) {
  if (!order.refund) return;
  order.refund.history.push({ status, note, actor, amount, at: new Date() });
}

function maybeStartAutoRefund(order, note) {
  if (!order || order.paymentMethod === 'cod') return;
  order.refund.status = 'requested';
  order.refund.amount = order.total || 0;
  order.refund.reason = note || 'Auto-created refund request';
  order.refund.requestedAt = new Date();
  order.refund.adminNote = '';
  pushRefundHistory(order, 'requested', order.refund.reason, 'system', order.refund.amount);
}

function setTrackingForStatus(order) {
  if (!order.tracking) {
    order.tracking = {
      kitchenLocation: { lat: 12.2958, lng: 76.6394 },
      riderLocation: { lat: null, lng: null, lastUpdated: null },
      progressPercent: 0,
      etaMinutes: 30
    };
  }
  if (!order.tracking.kitchenLocation) {
    order.tracking.kitchenLocation = { lat: 12.2958, lng: 76.6394 };
  }
  if (!order.tracking.riderLocation) {
    order.tracking.riderLocation = { lat: null, lng: null, lastUpdated: null };
  }
  if (!order.estimatedDelivery || Number.isNaN(new Date(order.estimatedDelivery).getTime())) {
    if (order.status === 'placed') {
      order.estimatedDelivery = null;
    } else {
      // Fallback ETA for non-placed statuses when an estimate is missing.
      order.estimatedDelivery = new Date(Date.now() + 3 * 60 * 1000);
    }
  }

  const progressBase = STATUS_PROGRESS[order.status] ?? 5;
  const hasEstimate = !!order.estimatedDelivery && !Number.isNaN(new Date(order.estimatedDelivery).getTime());
  const etaMs = hasEstimate ? Math.max(0, new Date(order.estimatedDelivery).getTime() - Date.now()) : 0;
  const etaMinutes = hasEstimate ? Math.ceil(etaMs / 60000) : 0;
  order.tracking.progressPercent = progressBase;
  order.tracking.etaMinutes = ['placed', 'delivered', 'cancelled'].includes(order.status) ? 0 : etaMinutes;

  if (order.status === 'out_for_delivery') {
    const kLat = order.tracking.kitchenLocation?.lat ?? 12.2958;
    const kLng = order.tracking.kitchenLocation?.lng ?? 76.6394;
    const cLat = order.address?.lat;
    const cLng = order.address?.lng;

    if (typeof cLat === 'number' && typeof cLng === 'number') {
      const progressRatio = clamp((progressBase - 65) / 35, 0, 1);
      order.tracking.riderLocation.lat = kLat + ((cLat - kLat) * progressRatio);
      order.tracking.riderLocation.lng = kLng + ((cLng - kLng) * progressRatio);
      order.tracking.riderLocation.lastUpdated = new Date();
    }
  }

  if (order.status === 'delivered') {
    order.tracking.riderLocation.lat = order.address?.lat ?? order.tracking.riderLocation.lat;
    order.tracking.riderLocation.lng = order.address?.lng ?? order.tracking.riderLocation.lng;
    order.tracking.riderLocation.lastUpdated = new Date();
  }
}

function buildTrackingPayload(order) {
  const kitchen = order.tracking?.kitchenLocation || { lat: 12.2958, lng: 76.6394 };
  const customer = {
    lat: order.address?.lat ?? null,
    lng: order.address?.lng ?? null
  };
  const rider = order.tracking?.riderLocation || { lat: null, lng: null, lastUpdated: null };
  const hasCoords = typeof customer.lat === 'number' && typeof customer.lng === 'number';
  const addressText = [
    order.address?.line1,
    order.address?.line2,
    order.address?.city,
    order.address?.pin
  ].filter(Boolean).join(', ');
  const mapUrl = hasCoords
    ? `https://www.google.com/maps/dir/${kitchen.lat},${kitchen.lng}/${customer.lat},${customer.lng}`
    : (addressText
      ? `https://www.google.com/maps/dir/${kitchen.lat},${kitchen.lng}/${encodeURIComponent(addressText)}`
      : '');

  return {
    orderId: order.orderId,
    status: order.status,
    progressPercent: order.tracking?.progressPercent || (STATUS_PROGRESS[order.status] ?? 0),
    etaMinutes: order.tracking?.etaMinutes ?? 0,
    kitchenLocation: kitchen,
    riderLocation: rider,
    customerLocation: customer,
    mapUrl,
    lastUpdated: rider.lastUpdated || order.updatedAt
  };
}

function buildPublicStatusPayload(order) {
  return {
    orderId: order.orderId,
    status: order.status,
    updatedAt: new Date().toISOString()
  };
}

function clampDuration(ms, minMs, maxMs) {
  return Math.max(minMs, Math.min(maxMs, ms));
}

function normalizeDeliveryTiming(raw) {
  const minMinutes = Math.max(2, Math.min(3, Number(raw?.minMinutes) || 2));
  const maxMinutesRaw = Math.max(2, Math.min(3, Number(raw?.maxMinutes) || 3));
  const maxMinutes = Math.max(minMinutes, maxMinutesRaw);

  const qtyWeightRaw = Math.max(0, Math.min(1, Number(raw?.qtyWeight) || 0.7));
  const varietyWeightRaw = Math.max(0, Math.min(1, Number(raw?.varietyWeight) || 0.3));
  const sum = qtyWeightRaw + varietyWeightRaw;

  const qtyWeight = sum > 0 ? (qtyWeightRaw / sum) : 0.7;
  const varietyWeight = sum > 0 ? (varietyWeightRaw / sum) : 0.3;

  return { minMinutes, maxMinutes, qtyWeight, varietyWeight };
}

// Keep delivery simulation strictly between configured min-max minutes (default 2-3), scaled by item load.
function computeDeliveryDurationMs(items = [], timingConfig = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  const totalQty = safeItems.reduce((sum, it) => sum + Math.max(1, Number(it?.quantity) || 1), 0);
  const uniqueCount = safeItems.length;
  const cfg = normalizeDeliveryTiming(timingConfig);

  // Heavier orders (more quantity + variety) move closer to max minutes.
  const qtyFactor = Math.min(1, Math.max(0, (totalQty - 1) / 8));
  const varietyFactor = Math.min(1, Math.max(0, (uniqueCount - 1) / 5));
  const prepFactor = (qtyFactor * cfg.qtyWeight) + (varietyFactor * cfg.varietyWeight);

  const minMs = Math.round(cfg.minMinutes * 60 * 1000);
  const maxMs = Math.round(cfg.maxMinutes * 60 * 1000);
  return clampDuration(Math.round(minMs + (prepFactor * (maxMs - minMs))), minMs, maxMs);
}

function getTrackingLink(orderId) {
  const base = String(process.env.CLIENT_URL || '').replace(/\/$/, '');
  if (!base) return `/orders.html?orderId=${encodeURIComponent(orderId)}`;
  return `${base}/orders.html?orderId=${encodeURIComponent(orderId)}`;
}

function formatEstimatedDelivery(order) {
  if (order?.deliverySchedule?.mode === 'scheduled' && order?.deliverySchedule?.scheduledFor) {
    return new Date(order.deliverySchedule.scheduledFor).toLocaleString('en-IN', { hour12: true });
  }

  if (order?.estimatedDelivery) {
    return new Date(order.estimatedDelivery).toLocaleString('en-IN', { hour12: true });
  }

  return 'Will be shared after order confirmation';
}

function buildOrderWhatsAppMessageData(order, userName) {
  return {
    customerName: userName || order?.address?.name || 'Customer',
    orderId: order.orderId,
    amount: Number(order.total || 0).toFixed(2),
    estimatedDelivery: formatEstimatedDelivery(order),
    trackingLink: getTrackingLink(order.orderId)
  };
}

function getOrderPhone(order) {
  const phone = String(order?.address?.phone || '').trim();
  return phone;
}

/**
 * POST /api/orders  — Create a new order (authenticated)
 */
exports.createOrder = async (req, res, next) => {
  try {
    const {
      orderId, items, address, paymentMethod,
      subtotal, discount, deliveryFee,
      gst, cgst, sgst, packagingFee,
      total, coupon, deliverySchedule, cookingInstructions
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Order must contain items' });
    }

    const { trustedItems, subtotal: trustedSubtotal } = await buildTrustedItemsAndSubtotal(items);

    const couponCode = String(coupon || '').trim().toUpperCase();
    const trustedDiscount = couponCode && VALID_COUPONS[couponCode]
      ? Math.min(VALID_COUPONS[couponCode], trustedSubtotal)
      : 0;
    const trustedDeliveryFee = Math.max(0, toMoney(deliveryFee));
    const taxable = Math.max(0, trustedSubtotal - trustedDiscount);
    const trustedCgst = toMoney(taxable * CGST_RATE);
    const trustedSgst = toMoney(taxable * SGST_RATE);
    const trustedPackagingFee = toMoney(taxable * PACKAGING_RATE);
    const trustedGst = trustedCgst + trustedSgst;
    const trustedTotal = taxable + trustedDeliveryFee + trustedGst + trustedPackagingFee;
    const trustedCookingInstructions = normalizeCookingInstructions(cookingInstructions);

    // Ignore client-provided monetary totals and store trusted server-side values.
    void subtotal;
    void discount;
    void gst;
    void cgst;
    void sgst;
    void packagingFee;
    void total;

    const scheduleMode = deliverySchedule?.mode === 'scheduled' ? 'scheduled' : 'asap';
    const requestedSchedule = deliverySchedule?.scheduledFor ? new Date(deliverySchedule.scheduledFor) : null;
    if (scheduleMode === 'scheduled') {
      if (!requestedSchedule || Number.isNaN(requestedSchedule.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid scheduled delivery time' });
      }
      const minSchedule = Date.now() + (20 * 60 * 1000);
      const maxSchedule = Date.now() + (7 * 24 * 60 * 60 * 1000);
      if (requestedSchedule.getTime() < minSchedule || requestedSchedule.getTime() > maxSchedule) {
        return res.status(400).json({ success: false, message: 'Scheduled delivery must be between 20 minutes and 7 days' });
      }
    }

    const order = await Order.create({
      orderId: orderId || 'BLZ' + Math.random().toString(36).substr(2, 7).toUpperCase(),
      user: req.user._id,
      items: trustedItems,
      address:       address       || {},
      paymentMethod: paymentMethod || 'upi',
      subtotal:      trustedSubtotal,
      discount:      trustedDiscount,
      deliveryFee:   trustedDeliveryFee,
      gst:           trustedGst,
      cgst:          trustedCgst,
      sgst:          trustedSgst,
      packagingFee:  trustedPackagingFee,
      total:         trustedTotal,
      coupon:        trustedDiscount > 0 ? couponCode : '',
      cookingInstructions: trustedCookingInstructions,
      // Delivery timing starts only after admin confirms the order.
      estimatedDelivery: null,
      deliverySchedule: {
        mode: scheduleMode,
        scheduledFor: scheduleMode === 'scheduled' ? requestedSchedule : null,
        slotLabel: deliverySchedule?.slotLabel || ''
      },
      tracking: {
        kitchenLocation: { lat: 12.2958, lng: 76.6394 },
        riderLocation: { lat: null, lng: null, lastUpdated: null },
        progressPercent: 5,
        etaMinutes: 0
      }
    });

    // Order stays as 'placed' — Admin must approve before simulation starts

    // ⚡ Instant push to all connected admin clients
    sse.broadcast('new-order', {
      orderId  : order.orderId,
      total    : order.total,
      itemCount: order.items.length,
      customer : req.user.name || req.user.email || 'Customer',
      status   : 'placed',
      cookingInstructions: trustedCookingInstructions,
      requiresConfirmation: true,
      message  : 'New order received. Awaiting admin confirmation.',
      time     : new Date().toISOString()
    });

    sse.broadcastPublic('order-status-updated', buildPublicStatusPayload(order));

    // Fire-and-forget: avoid delaying order response on external API latency/failure.
    setImmediate(() => {
      const phone = getOrderPhone(order);
      if (!phone) {
        console.warn(`WhatsApp skipped: no phone number for order ${order.orderId}`);
        return;
      }

      sendWhatsAppMessage(phone, buildOrderWhatsAppMessageData(order, req.user?.name))
        .then(result => {
          if (!result.success) {
            console.error(`WhatsApp failed for order ${order.orderId}:`, result.error || result.details || 'Unknown error');
          }
        })
        .catch(err => {
          console.error(`WhatsApp exception for order ${order.orderId}:`, err.message);
        });
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders  — Get all orders for the logged-in user
 */
exports.getMyOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      Order.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments({ user: req.user._id })
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalCount,
      pagination: { page, limit, hasMore: skip + orders.length < totalCount },
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/:orderId  — Get single order (only if it belongs to the user)
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      orderId: req.params.orderId,
      user:    req.user._id
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:orderId/cancel  — Smart cancel
 *   • Within 1 minute of placement → auto-cancel immediately
 *   • After 1 minute               → require reason; creates a pending cancel request
 */
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      orderId: req.params.orderId,
      user:    req.user._id
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const cancellable = ['placed', 'confirmed'];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in "${order.status}" status`
      });
    }

    // Block duplicate cancel requests
    if (order.cancelRequest && order.cancelRequest.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'A cancel request is already pending admin review'
      });
    }

    const ageMs       = Date.now() - new Date(order.createdAt).getTime();
    const withinOneMin = ageMs <= 60 * 1000;

    if (withinOneMin) {
      // Auto-cancel immediately
      order.status = 'cancelled';
      order.statusHistory.push({
        status:    'cancelled',
        timestamp: new Date(),
        note:      'Order cancelled by customer within 1 minute'
      });
      maybeStartAutoRefund(order, 'Auto refund initiated: customer cancelled within 1 minute');
      setTrackingForStatus(order);
      await order.save();

      sse.broadcastPublic('order-status-updated', buildPublicStatusPayload(order));

      return res.status(200).json({
        success:     true,
        autoCancel:  true,
        message:     'Order cancelled successfully',
        data:        order
      });
    }

    // After 1 minute — require reason from user
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success:         false,
        requiresReason:  true,
        message:         'Please provide a reason for cancellation'
      });
    }

    order.cancelRequest = {
      status:      'pending',
      reason:      reason.trim(),
      requestedAt: new Date(),
      resolvedAt:  null,
      adminNote:   ''
    };
    await order.save();

    // Notify admin via SSE
    sse.broadcast('cancel-request', {
      orderId:    order.orderId,
      reason:     reason.trim(),
      customer:   req.user.name || req.user.email || 'Customer',
      time:       new Date().toISOString()
    });

    return res.status(200).json({
      success:        true,
      autoCancel:     false,
      message:        'Cancel request submitted. Awaiting admin review.',
      data:           order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:orderId/cancel-request/approve (admin only)
 * Approve a customer cancel request → cancel the order and notify user
 */
exports.approveCancelRequest = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!order.cancelRequest || order.cancelRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending cancel request found' });
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status:    'cancelled',
      timestamp: new Date(),
      note:      'Order cancelled — customer cancel request approved by admin'
    });
    order.cancelRequest.status     = 'approved';
    order.cancelRequest.resolvedAt = new Date();
    order.cancelRequest.adminNote  = req.body.adminNote || '';
    maybeStartAutoRefund(order, 'Auto refund initiated: admin approved cancellation request');
    setTrackingForStatus(order);

    order.userNotification = {
      message: '✅ Your order has been cancelled successfully. We hope to serve you again!',
      type:    'success',
      read:    false
    };

    await order.save();

    sse.broadcastPublic('order-status-updated', buildPublicStatusPayload(order));

    res.status(200).json({ success: true, data: order });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/orders/:orderId/cancel-request/reject (admin only)
 * Reject a customer cancel request → keep order active, notify user
 */
exports.rejectCancelRequest = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!order.cancelRequest || order.cancelRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending cancel request found' });
    }

    order.cancelRequest.status     = 'rejected';
    order.cancelRequest.resolvedAt = new Date();
    order.cancelRequest.adminNote  = req.body.adminNote || '';

    order.userNotification = {
      message: '🔥 Your order is almost ready, so it cannot be cancelled. Thank you for your patience!',
      type:    'error',
      read:    false
    };

    await order.save();

    sse.broadcastPublic('order-status-updated', buildPublicStatusPayload(order));

    res.status(200).json({ success: true, data: order });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/orders/:orderId/notification/read (user) — mark notification as read
 */
exports.markNotificationRead = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.userNotification) {
      order.userNotification.read = true;
      await order.save();
    }
    res.status(200).json({ success: true });
  } catch (err) { next(err); }
};


/**
 * Simulate real-time order progress (for demo purposes)
 * In production this would be triggered by kitchen/delivery systems
 */
function simulateOrderProgress(orderMongoId, opts = {}) {
  const startAt = opts.startAt ? new Date(opts.startAt).getTime() : null;
  const startDelay = startAt ? Math.max(0, startAt - Date.now()) : 0;
  const totalDurationMs = clampDuration(
    Number(opts.totalDurationMs) || (2 * 60 * 1000),
    2 * 60 * 1000,
    3 * 60 * 1000
  );

  const toPreparing = Math.round(totalDurationMs * 0.25);
  const toOutForDelivery = Math.round(totalDurationMs * 0.65);
  const toDelivered = totalDurationMs;

  const stages = [
    { status: 'preparing',        note: 'Chef is preparing your food',     delay: toPreparing },
    { status: 'out_for_delivery', note: 'Rider picked up your order',      delay: toOutForDelivery - toPreparing },
    { status: 'delivered',        note: 'Order delivered successfully',     delay: toDelivered - toOutForDelivery },
  ];

  let totalDelay = startDelay;
  stages.forEach(stage => {
    totalDelay += stage.delay;
    setTimeout(async () => {
      try {
        const order = await Order.findById(orderMongoId);
        if (!order || order.status === 'cancelled' || order.status === 'delivered') return;

        order.status = stage.status;
        order.statusHistory.push({
          status:    stage.status,
          timestamp: new Date(),
          note:      stage.note
        });
        setTrackingForStatus(order);
        await order.save();

        sse.broadcastPublic('order-status-updated', buildPublicStatusPayload(order));
      } catch (e) {
        console.error('Status simulation error:', e.message);
      }
    }, totalDelay);
  });
}

/**
 * PATCH /api/orders/:orderId/approve  (admin only) — Approve a pending order
 */
exports.approveOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'placed') {
      return res.status(400).json({ success: false, message: `Order is already "${order.status}"` });
    }

    const settings = await SiteSettings.getSettings();
    const timingConfig = normalizeDeliveryTiming(settings?.deliveryTiming);
    const scheduledAt = order.deliverySchedule?.mode === 'scheduled' ? order.deliverySchedule?.scheduledFor : null;
    const startAtMs = scheduledAt ? new Date(scheduledAt).getTime() : Date.now();
    const totalDurationMs = computeDeliveryDurationMs(order.items || [], timingConfig);

    order.status = 'confirmed';
    order.estimatedDelivery = new Date(startAtMs + totalDurationMs);
    order.statusHistory.push({ status: 'confirmed', timestamp: new Date(), note: 'Order approved by admin' });
    setTrackingForStatus(order);
    await order.save();

    sse.broadcastPublic('order-status-updated', buildPublicStatusPayload(order));

    simulateOrderProgress(order._id, { startAt: scheduledAt, totalDurationMs }); // item-aware 2-3 min pipeline
    res.status(200).json({ success: true, data: order });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/orders/:orderId/reject  (admin only) — Reject a pending order
 */
exports.rejectOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['placed', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot reject order in "${order.status}" status` });
    }
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled', timestamp: new Date(),
      note: reason ? `Rejected by admin: ${reason}` : 'Order rejected by admin'
    });
    maybeStartAutoRefund(order, 'Auto refund initiated: order rejected by admin');
    setTrackingForStatus(order);
    await order.save();

    sse.broadcastPublic('order-status-updated', buildPublicStatusPayload(order));

    res.status(200).json({ success: true, data: order });
  } catch (err) { next(err); }
};

/**
 * GET /api/orders/all (admin only) — Get all orders
 */
exports.getAllOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      Order.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalCount,
      pagination: { page, limit, hasMore: skip + orders.length < totalCount },
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:orderId/status (admin only) — Update order status
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`
    });
    setTrackingForStatus(order);
    await order.save();

    // Notify frontend clients about order status change
    sse.broadcastPublic('order-status-updated', buildPublicStatusPayload(order));

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/:orderId/tracking
 * Live tracking payload for map + ETA widgets
 */
exports.getOrderTracking = async (req, res, next) => {
  try {
    const query = { orderId: req.params.orderId };
    if (req.user.role !== 'admin') query.user = req.user._id;

    const order = await Order.findOne(query);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    setTrackingForStatus(order);
    await order.save();

    res.status(200).json({ success: true, data: buildTrackingPayload(order) });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:orderId/delivered/confirm
 * User-side confirmation from live tracking when rider reaches destination.
 */
exports.confirmDeliveredFromTracking = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.status === 'delivered') {
      return res.status(200).json({ success: true, message: 'Order already delivered', data: order });
    }

    if (order.status !== 'out_for_delivery') {
      return res.status(400).json({ success: false, message: `Cannot mark delivered from status "${order.status}"` });
    }

    order.status = 'delivered';
    order.statusHistory.push({
      status: 'delivered',
      timestamp: new Date(),
      note: 'Auto-delivered: rider reached destination on live tracking'
    });
    setTrackingForStatus(order);
    await order.save();

    sse.broadcastPublic('order-status-updated', buildPublicStatusPayload(order));

    sse.broadcast('order-delivered', {
      orderId: order.orderId,
      total: order.total,
      customer: req.user.name || req.user.email || 'Customer',
      time: new Date().toISOString()
    });

    res.status(200).json({ success: true, message: 'Order marked delivered', data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:orderId/refund/request
 */
exports.requestRefund = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!['cancelled', 'delivered'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Refund can be requested only for delivered or cancelled orders' });
    }
    if (order.paymentMethod === 'cod') {
      return res.status(400).json({ success: false, message: 'COD orders are not eligible for wallet refund' });
    }
    if (['requested', 'approved', 'processed'].includes(order.refund?.status)) {
      return res.status(400).json({ success: false, message: 'Refund request already exists for this order' });
    }

    const reqAmount = Number(req.body.amount);
    const amount = Number.isFinite(reqAmount) && reqAmount > 0
      ? Math.min(reqAmount, order.total)
      : order.total;
    const reason = (req.body.reason || '').trim() || 'Customer requested refund';
    const proofUrls = Array.isArray(req.body.proofUrls)
      ? req.body.proofUrls.filter(u => typeof u === 'string' && u.trim()).slice(0, 4)
      : [];

    const proofPayloadBytes = Buffer.byteLength(JSON.stringify(proofUrls), 'utf8');
    if (proofPayloadBytes > 1400000) {
      return res.status(413).json({
        success: false,
        message: 'Proof images are too large. Please use smaller images.'
      });
    }

    order.refund.status = 'requested';
    order.refund.amount = amount;
    order.refund.reason = reason;
    order.refund.proofUrls = proofUrls;
    order.refund.requestedAt = new Date();
    order.refund.resolvedAt = null;
    order.refund.adminNote = '';
    pushRefundHistory(order, 'requested', reason, 'user', amount);

    await order.save();
    sse.broadcast('refund-request', {
      orderId: order.orderId,
      amount,
      reason,
      customer: req.user.name || req.user.email || 'Customer',
      time: new Date().toISOString()
    });

    res.status(200).json({ success: true, message: 'Refund request submitted', data: order.refund });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:orderId/refund/approve (admin)
 */
exports.approveRefund = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.refund?.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'No pending refund request found' });
    }

    order.refund.status = 'approved';
    order.refund.resolvedAt = new Date();
    order.refund.adminNote = (req.body.adminNote || '').trim();
    pushRefundHistory(order, 'approved', order.refund.adminNote || 'Refund approved by admin', 'admin', order.refund.amount);

    order.userNotification = {
      message: `✅ Refund approved for order ${order.orderId}. Amount: ₹${order.refund.amount}`,
      type: 'success',
      read: false
    };

    await order.save();
    res.status(200).json({ success: true, data: order.refund });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:orderId/refund/reject (admin)
 */
exports.rejectRefund = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.refund?.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'No pending refund request found' });
    }

    const adminNote = (req.body.adminNote || '').trim();
    order.refund.status = 'rejected';
    order.refund.resolvedAt = new Date();
    order.refund.adminNote = adminNote;
    pushRefundHistory(order, 'rejected', adminNote || 'Refund rejected by admin', 'admin', order.refund.amount);

    order.userNotification = {
      message: `❌ Refund request rejected for order ${order.orderId}${adminNote ? `: ${adminNote}` : ''}`,
      type: 'error',
      read: false
    };

    await order.save();
    res.status(200).json({ success: true, data: order.refund });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:orderId/refund/process (admin)
 */
exports.processRefund = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['approved', 'requested'].includes(order.refund?.status)) {
      return res.status(400).json({ success: false, message: 'Refund must be approved or requested before processing' });
    }

    const adminNote = (req.body.adminNote || '').trim();
    order.refund.status = 'processed';
    order.refund.resolvedAt = new Date();
    order.refund.adminNote = adminNote;
    pushRefundHistory(order, 'processed', adminNote || 'Refund processed', 'admin', order.refund.amount);

    order.userNotification = {
      message: `💸 Refund processed for order ${order.orderId}. Amount: ₹${order.refund.amount}`,
      type: 'success',
      read: false
    };

    await order.save();
    res.status(200).json({ success: true, data: order.refund });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:orderId/items/:itemIdx/review
 */
exports.submitItemReview = async (req, res, next) => {
  try {
    const itemIdx = Number(req.params.itemIdx);
    if (!Number.isInteger(itemIdx) || itemIdx < 0) {
      return res.status(400).json({ success: false, message: 'Invalid item index' });
    }

    const order = await Order.findOne({ orderId: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Item reviews are allowed only after delivery' });
    }

    const item = order.items[itemIdx];
    if (!item) return res.status(404).json({ success: false, message: 'Order item not found' });

    const rating = Number(req.body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const photoUrls = Array.isArray(req.body.photoUrls)
      ? req.body.photoUrls.filter(u => typeof u === 'string' && u.trim()).slice(0, 4)
      : [];

    const photoPayloadBytes = Buffer.byteLength(JSON.stringify(photoUrls), 'utf8');
    if (photoPayloadBytes > 1400000) {
      return res.status(413).json({
        success: false,
        message: 'Pasted images are too large. Please use smaller images.'
      });
    }

    item.review = {
      rating,
      comment: (req.body.comment || '').trim(),
      photoUrls,
      reviewedAt: new Date()
    };

    await order.save();

    sse.broadcast('new-review', {
      orderId: order.orderId,
      itemName: item.name,
      rating,
      hasPhotos: photoUrls.length > 0,
      customer: req.user?.name || req.user?.email || 'Customer',
      reviewedAt: item.review.reviewedAt
    });

    res.status(200).json({ success: true, message: 'Review submitted', data: item.review });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/orders/:orderId/notify-whatsapp (admin only)
 * Manual trigger for order confirmation WhatsApp message.
 */
exports.sendOrderWhatsAppNotification = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).populate('user', 'name');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const phone = getOrderPhone(order);
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Order does not have a phone number' });
    }

    const result = await sendWhatsAppMessage(phone, buildOrderWhatsAppMessageData(order, order.user?.name));
    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: 'Failed to send WhatsApp notification',
        error: result.error || 'Unknown error',
        details: result.details || null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'WhatsApp notification sent',
      data: {
        orderId: order.orderId,
        messageId: result.messageId || null,
        to: result.to
      }
    });
  } catch (err) {
    next(err);
  }
};
