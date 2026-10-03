/* =============================================
   BLAZE KITCHEN — controllers/admin.controller.js
   Admin-specific endpoints for the admin panel
   ============================================= */

const User         = require('../models/User.model');
const Order        = require('../models/Order.model');
const Menu         = require('../models/Menu.model');
const CategoryMenu = require('../models/CategoryMenu.model');
const AdminLoginLog = require('../models/AdminLoginLog.model');
const sse          = require('../sse');

/* ── Admin Login Logs ── */
exports.getLoginLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs  = await AdminLoginLog.find()
      .sort({ loggedAt: -1 })
      .limit(limit)
      .lean();
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

/* ── Dashboard Stats ── */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers  = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalMenu   = await Menu.countDocuments();

    // Revenue
    const revenueAgg = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Daily orders (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyOrders = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$total' }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Users registered per day (last 7 days)
    const dailyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Recent orders (latest 10)
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Active orders
    const activeOrders = await Order.countDocuments({
      status: { $in: ['placed', 'confirmed', 'preparing', 'out_for_delivery'] }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers, totalOrders, totalMenu, totalRevenue,
        activeOrders,
        ordersByStatus: ordersByStatus.reduce((acc, o) => { acc[o._id] = o.count; return acc; }, {}),
        dailyOrders,
        dailyUsers,
        recentOrders
      }
    });
  } catch (err) {
    next(err);
  }
};

/* ── All Users with order-count ── */
exports.getAllUsersDetailed = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();

    // Attach order count per user
    const orderCounts = await Order.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 }, spent: { $sum: '$total' } } }
    ]);
    const countMap = {};
    orderCounts.forEach(o => { countMap[o._id?.toString()] = { orders: o.count, spent: o.spent }; });

    const enriched = users.map(u => ({
      ...u,
      orderCount: countMap[u._id.toString()]?.orders || 0,
      totalSpent: countMap[u._id.toString()]?.spent  || 0
    }));

    res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
};

/* ── All Orders ── */
exports.getAllOrdersAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

/* ── All Menu Items ── */
exports.getAllMenuAdmin = async (req, res, next) => {
  try {
    const items = await Menu.find().sort({ category: 1, name: 1 });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err) {
    next(err);
  }
};

/* ── Toggle Menu Availability ── */
exports.toggleMenuAvailability = async (req, res, next) => {
  try {
    const item = await Menu.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
    item.availability = !item.availability;
    await item.save();
    sse.broadcastAll('menu-updated', { action: 'availability-toggled', category: item.category });
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

/* ── Activity Log (recent orders + users) ── */
exports.getActivities = async (req, res, next) => {
  try {
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(30);

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(20);

    const activities = [];

    recentOrders.forEach(o => {
      activities.push({
        type: 'order',
        message: `${o.user?.name || 'Unknown'} placed order ${o.orderId} — ₹${o.total}`,
        status: o.status,
        time: o.createdAt
      });
      // Add status changes from history
      if (o.statusHistory) {
        o.statusHistory.forEach(sh => {
          if (sh.status !== 'placed') {
            activities.push({
              type: 'status',
              message: `Order ${o.orderId} → ${sh.status.replace(/_/g, ' ')}`,
              status: sh.status,
              time: sh.timestamp
            });
          }
        });
      }
    });

    recentUsers.forEach(u => {
      activities.push({
        type: 'user',
        message: `${u.name} joined Blaze Kitchen`,
        status: 'new',
        time: u.createdAt
      });
    });

    // Sort all activities by time desc
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.status(200).json({ success: true, data: activities.slice(0, 50) });
  } catch (err) {
    next(err);
  }
};

/* ── Analytics ── */
exports.getAnalytics = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Revenue by day (30 days)
    const dailyRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Top selling items
    const topItems = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', count: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Orders by payment method
    const byPayment = await Order.aggregate([
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$total' } } }
    ]);

    // Orders by hour of day
    const byHour = await Order.aggregate([
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // User growth (30 days)
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Average order value
    const avgOrder = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, avg: { $avg: '$total' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        dailyRevenue,
        topItems,
        byPayment: byPayment.reduce((acc, p) => { acc[p._id] = { count: p.count, revenue: p.revenue }; return acc; }, {}),
        byHour,
        userGrowth,
        avgOrderValue: Math.round(avgOrder[0]?.avg || 0)
      }
    });
  } catch (err) {
    next(err);
  }
};

/* ── Sales Summary (by date) ── */
exports.getSalesSummary = async (req, res, next) => {
  try {
    const dateStr = String(req.query.date || '').trim();
    const baseDate = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    if (Number.isNaN(baseDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    baseDate.setHours(0, 0, 0, 0);
    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + 1);

    const orders = await Order.find({ createdAt: { $gte: baseDate, $lt: endDate } }).lean();
    const nonCancelled = orders.filter(o => o.status !== 'cancelled');
    const openStatuses = new Set(['placed', 'confirmed', 'preparing', 'out_for_delivery']);

    const num = v => Number(v) || 0;
    const sum = (arr, fn) => arr.reduce((acc, x) => acc + fn(x), 0);

    const grossSales = sum(nonCancelled, o => num(o.subtotal));
    const discounts = sum(nonCancelled, o => num(o.discount));
    const salesReturn = sum(nonCancelled, o => {
      const status = o.refund?.status;
      return (status === 'approved' || status === 'processed') ? num(o.refund?.amount) : 0;
    });
    const salesWithoutTax = Math.max(0, grossSales - discounts - salesReturn);

    const cgst = sum(nonCancelled, o => num(o.cgst) || (o.gst ? num(o.gst) / 2 : 0));
    const sgst = sum(nonCancelled, o => num(o.sgst) || (o.gst ? num(o.gst) / 2 : 0));
    const taxTotal = cgst + sgst;

    const packagingCharges = sum(nonCancelled, o => num(o.packagingFee));
    const deliveryCharges = sum(nonCancelled, o => num(o.deliveryFee));
    const convenienceCharges = 0;
    const serviceCharges = 0;
    const chargeTotal = packagingCharges + deliveryCharges + convenienceCharges + serviceCharges;

    const totalRevenue = sum(nonCancelled, o => num(o.total));
    const salesWithTax = totalRevenue;

    const paidOrders = nonCancelled.filter(o => o.paymentMethod !== 'cod' || o.status === 'delivered');
    const payCash = sum(paidOrders.filter(o => o.paymentMethod === 'cod'), o => num(o.total));
    const payPhonePe = sum(paidOrders.filter(o => o.paymentMethod === 'upi'), o => num(o.total));
    const payCard = sum(paidOrders.filter(o => o.paymentMethod === 'card'), o => num(o.total));
    const payWallet = sum(paidOrders.filter(o => o.paymentMethod === 'wallet'), o => num(o.total));
    const paymentTotal = payCash + payPhonePe + payCard + payWallet;
    const balanceDue = Math.max(0, totalRevenue - paymentTotal);

    const openOrders = nonCancelled.filter(o => openStatuses.has(o.status));
    const openOrderTotal = sum(openOrders, o => num(o.total));
    const openOrderPaid = sum(openOrders.filter(o => o.paymentMethod !== 'cod'), o => num(o.total));
    const openOrderBalance = Math.max(0, openOrderTotal - openOrderPaid);

    const numberOfOrders = nonCancelled.length;
    const customerSet = new Set(nonCancelled.map(o => String(o.user || '')).filter(Boolean));
    const numberOfCustomers = customerSet.size;
    const avgOrderValue = numberOfOrders ? totalRevenue / numberOfOrders : 0;
    const avgSalePerCustomer = numberOfCustomers ? totalRevenue / numberOfCustomers : 0;

    const itemMap = new Map();
    nonCancelled.forEach(order => {
      (order.items || []).forEach(item => {
        const key = String(item?.name || '');
        if (!key) return;
        const entry = itemMap.get(key) || { name: key, qty: 0, amount: 0 };
        const qty = num(item.quantity);
        const price = num(item.price);
        entry.qty += qty;
        entry.amount += qty * price;
        itemMap.set(key, entry);
      });
    });

    const items = Array.from(itemMap.values())
      .map(i => ({
        name: i.name,
        quantity: i.qty,
        rate: i.qty ? (i.amount / i.qty) : 0,
        amount: i.amount
      }))
      .sort((a, b) => b.amount - a.amount);

    const totalItemsSold = items.reduce((acc, i) => acc + i.quantity, 0);
    const itemsTotalAmount = items.reduce((acc, i) => acc + i.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        businessDate: baseDate.toISOString().slice(0, 10),
        salesOverview: {
          grossSales,
          salesReturn,
          discounts,
          directCharges: 0,
          netSales: salesWithoutTax,
          salesWithTax,
          salesWithoutTax,
          otherCharges: chargeTotal,
          taxes: taxTotal,
          rounding: 0,
          totalRevenue,
          payments: paymentTotal,
          balanceDue
        },
        paymentSummary: {
          cash: payCash,
          phonepe: payPhonePe,
          card: payCard,
          wallet: payWallet,
          total: paymentTotal
        },
        salesMetrics: {
          numberOfOrders,
          averageOrderValue: avgOrderValue,
          numberOfCustomers,
          averageSalePerCustomer: avgSalePerCustomer,
          openOrders: openOrders.length,
          openOrderTotal,
          openOrderPaid,
          openOrderBalance
        },
        productSummary: {
          items,
          totalItemsSold,
          totalAmount: itemsTotalAmount
        },
        taxSummary: {
          salesWithTax,
          salesWithoutTax,
          cgst,
          sgst,
          taxTotal
        },
        chargeSummary: {
          packagingCharges,
          deliveryCharges,
          convenienceCharges,
          serviceCharges,
          chargeTotal
        },
        grandTotals: {
          totalOrders: numberOfOrders,
          totalItemsSold,
          totalRevenue,
          totalTaxCollected: taxTotal,
          totalChargesCollected: chargeTotal,
          netCollection: paymentTotal
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/* ── Item Reviews (from order items) ── */
exports.getItemReviewsAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find({
      $or: [
        { 'items.review.rating': { $exists: true } },
        { 'refund.status': { $in: ['requested', 'approved', 'rejected', 'processed'] } }
      ]
    })
      .populate('user', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    const reviews = [];
    const refundRequests = [];
    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach((item, idx) => {
        const review = item?.review;
        if (!review || !review.rating) return;
        reviews.push({
          id: `${order.orderId}_${idx}_${new Date(review.reviewedAt || order.updatedAt).getTime()}`,
          orderRef: String(order._id),
          itemIndex: idx,
          orderId: order.orderId,
          orderStatus: order.status,
          paymentMethod: order.paymentMethod,
          itemName: item.name,
          itemImage: item.image || '',
          quantity: item.quantity || 1,
          rating: Number(review.rating) || 0,
          comment: review.comment || '',
          photoUrls: Array.isArray(review.photoUrls) ? review.photoUrls : [],
          reviewedAt: review.reviewedAt || order.updatedAt,
          user: {
            name: order.user?.name || 'Unknown',
            email: order.user?.email || ''
          }
        });
      });

      const refund = order.refund || {};
      if (refund.status && refund.status !== 'none') {
        refundRequests.push({
          id: `${order.orderId}_${refund.status}_${new Date(refund.requestedAt || order.updatedAt).getTime()}`,
          orderRef: String(order._id),
          orderId: order.orderId,
          orderStatus: order.status,
          paymentMethod: order.paymentMethod,
          refundStatus: refund.status,
          amount: Number(refund.amount) || Number(order.total) || 0,
          reason: refund.reason || '',
          proofUrls: Array.isArray(refund.proofUrls) ? refund.proofUrls : [],
          requestedAt: refund.requestedAt || null,
          resolvedAt: refund.resolvedAt || null,
          adminNote: refund.adminNote || '',
          user: {
            name: order.user?.name || 'Unknown',
            email: order.user?.email || ''
          }
        });
      }
    }

    reviews.sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt));
    refundRequests.sort((a, b) => new Date(b.requestedAt || b.resolvedAt || 0) - new Date(a.requestedAt || a.resolvedAt || 0));

    const total = reviews.length;
    const withPhotos = reviews.filter(r => r.photoUrls.length > 0).length;
    const refundRequested = refundRequests.filter(r => r.refundStatus === 'requested').length;
    const refundWithProofs = refundRequests.filter(r => (r.proofUrls || []).length > 0).length;
    const avgRating = total
      ? Number((reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / total).toFixed(2))
      : 0;

    res.status(200).json({
      success: true,
      count: total,
      data: reviews,
      refundRequests,
      summary: {
        total,
        withPhotos,
        avgRating,
        refundRequested,
        refundWithProofs
      }
    });
  } catch (err) {
    next(err);
  }
};

/* ── Delete Item Review (admin) ── */
exports.deleteItemReviewAdmin = async (req, res, next) => {
  try {
    const { orderRef, itemIndex } = req.params;
    const idx = Number(itemIndex);

    if (!orderRef || !Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'Invalid order reference or item index' });
    }

    const order = await Order.findById(orderRef);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!Array.isArray(order.items) || !order.items[idx]) {
      return res.status(404).json({ success: false, message: 'Order item not found' });
    }

    const item = order.items[idx];
    if (!item.review || !item.review.rating) {
      return res.status(404).json({ success: false, message: 'Review not found for this item' });
    }

    item.review = undefined;
    order.markModified('items');
    await order.save();

    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/* ── Change Admin Password ── */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

/* ── CategoryMenu: get all ── */
exports.getCategoryMenusAdmin = async (req, res, next) => {
  try {
    const cats = await CategoryMenu.find().sort({ createdAt: 1 });
    res.json({ success: true, data: cats });
  } catch (err) { next(err); }
};

/* ── CategoryMenu: toggle availability ── */
exports.toggleCategoryAvailability = async (req, res, next) => {
  try {
    const cat = await CategoryMenu.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    cat.availability = !cat.availability;
    await cat.save();
    sse.broadcastAll('menu-updated', { action: 'category-availability-toggled', category: cat.category });
    res.json({ success: true, data: cat });
  } catch (err) { next(err); }
};

/* ── CategoryMenu: set availability explicitly ── */
exports.setCategoryAvailability = async (req, res, next) => {
  try {
    const { availability } = req.body;
    if (typeof availability !== 'boolean') {
      return res.status(400).json({ success: false, message: 'availability must be a boolean' });
    }
    const cat = await CategoryMenu.findByIdAndUpdate(
      req.params.id,
      { availability },
      { new: true }
    );
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    sse.broadcastAll('menu-updated', { action: 'category-availability-set', category: cat.category });
    res.json({ success: true, data: cat });
  } catch (err) { next(err); }
};

/* ══════════════════════════════════════════
   MANAGE ADMIN ACCOUNTS
   ══════════════════════════════════════════ */

/* ── List all admins ── */
exports.listAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('name email role createdAt loginCount lastLogin')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (err) { next(err); }
};

/* ── Create new admin ── */
exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    const admin = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,              // pre-save hook auto-hashes
      role: 'admin'
    });
    await admin.save();
    console.log(`✅ New admin created: ${admin.email}`);
    res.status(201).json({ success: true, message: `Admin "${admin.name}" created`, data: admin });
  } catch (err) { next(err); }
};

/* ── Update admin ── */
exports.updateAdmin = async (req, res, next) => {
  try {
    const admin = await User.findById(req.params.id).select('+password');
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    const { name, email, password } = req.body;
    if (name) admin.name = name.trim();
    if (email) {
      const dup = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: admin._id } });
      if (dup) return res.status(409).json({ success: false, message: 'Email already in use' });
      admin.email = email.toLowerCase().trim();
    }
    if (password && password.length >= 6) {
      admin.password = password;   // pre-save hook auto-hashes
    }
    await admin.save();
    console.log(`✏️ Admin updated: ${admin.email}`);
    res.json({ success: true, message: `Admin "${admin.name}" updated`, data: admin });
  } catch (err) { next(err); }
};

/* ── Delete admin ── */
exports.deleteAdmin = async (req, res, next) => {
  try {
    if (req.params.id === req.user?.id || req.params.id === req.user?._id?.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }
    const count = await User.countDocuments({ role: 'admin' });
    if (count <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the last admin' });
    }
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    await User.findByIdAndDelete(req.params.id);
    console.log(`🗑️ Admin deleted: ${admin.email}`);
    res.json({ success: true, message: `Admin "${admin.name}" deleted` });
  } catch (err) { next(err); }
};
