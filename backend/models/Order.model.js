/* =============================================
   BLAZE KITCHEN — models/Order.model.js
   ============================================= */

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  price:    { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image:    { type: String, default: '' },
  review: {
    rating:    { type: Number, min: 1, max: 5 },
    comment:   { type: String, default: '' },
    photoUrls: { type: [String], default: [] },
    reviewedAt:{ type: Date }
  }
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true
    },
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true
    },
    items: {
      type:     [orderItemSchema],
      required: true,
      validate: [arr => arr.length > 0, 'Order must have at least one item']
    },
    address: {
      type:  { type: String, default: 'Home' },
      name:  { type: String },
      line1: { type: String },
      line2: { type: String },
      city:  { type: String },
      pin:   { type: String },
      phone: { type: String }
    },
    paymentMethod: {
      type:    String,
      enum:    ['upi', 'card', 'wallet', 'cod'],
      default: 'upi'
    },
    subtotal:     { type: Number, required: true },
    discount:     { type: Number, default: 0 },
    deliveryFee:  { type: Number, default: 0 },
    gst:          { type: Number, default: 0 },   // legacy combined GST
    cgst:         { type: Number, default: 0 },   // Central GST 2.5%
    sgst:         { type: Number, default: 0 },   // State GST 2.5%
    packagingFee: { type: Number, default: 0 },   // Packaging 7%
    total:        { type: Number, required: true },
    coupon:       { type: String, default: '' },
    cookingInstructions: { type: String, default: '', maxlength: 300 },

    /* ── Order Tracking ── */
    status: {
      type:    String,
      enum:    ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed'
    },
    statusHistory: [
      {
        status:    { type: String },
        timestamp: { type: Date, default: Date.now },
        note:      { type: String, default: '' }
      }
    ],
    estimatedDelivery: {
      type:    Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    },

    deliverySchedule: {
      mode: { type: String, enum: ['asap', 'scheduled'], default: 'asap' },
      scheduledFor: { type: Date, default: null },
      slotLabel: { type: String, default: '' }
    },

    tracking: {
      kitchenLocation: {
        lat: { type: Number, default: 12.2958 },
        lng: { type: Number, default: 76.6394 }
      },
      riderLocation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        lastUpdated: { type: Date, default: null }
      },
      progressPercent: { type: Number, default: 0 },
      etaMinutes: { type: Number, default: 30 }
    },

    /* ── Cancellation Request (after 1-minute window) ── */
    cancelRequest: {
      status:      { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
      reason:      { type: String, default: '' },
      requestedAt: { type: Date },
      resolvedAt:  { type: Date },
      adminNote:   { type: String, default: '' }
    },

    /* ── User notification message (set by admin approve/reject) ── */
    userNotification: {
      message: { type: String, default: '' },
      type:    { type: String, default: '' },  // 'success' | 'error'
      read:    { type: Boolean, default: false }
    },

    refund: {
      status: {
        type: String,
        enum: ['none', 'requested', 'approved', 'rejected', 'processed'],
        default: 'none'
      },
      amount:      { type: Number, default: 0 },
      reason:      { type: String, default: '' },
      proofUrls:   { type: [String], default: [] },
      requestedAt: { type: Date, default: null },
      resolvedAt:  { type: Date, default: null },
      adminNote:   { type: String, default: '' },
      history: {
        type: [{
          status: { type: String },
          note:   { type: String, default: '' },
          amount: { type: Number, default: 0 },
          actor:  { type: String, default: 'system' },
          at:     { type: Date, default: Date.now }
        }],
        default: []
      }
    }
  },
  { timestamps: true }
);

// Auto-populate status history on creation
orderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.statusHistory = [
      { status: 'placed', timestamp: new Date(), note: 'Order placed successfully' }
    ];
    this.tracking.progressPercent = 5;
    this.tracking.etaMinutes = 30;
  }
  next();
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'refund.status': 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
