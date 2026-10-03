/* =============================================
   BLAZE KITCHEN — models/AdminLoginLog.model.js
   Stores every admin login event in MongoDB
   ============================================= */

const mongoose = require('mongoose');

const adminLoginLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref : 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    ip: {
      type   : String,
      default: 'unknown'
    },
    userAgent: {
      type   : String,
      default: 'unknown'
    },
    status: {
      type   : String,
      enum   : ['success', 'failed'],
      default: 'success'
    },
    failReason: {
      type   : String,
      default: ''
    },
    loggedAt: {
      type   : Date,
      default: Date.now
    }
  },
  {
    // Keep no updatedAt — logs are immutable
    timestamps: { createdAt: 'loggedAt', updatedAt: false },
    versionKey: false
  }
);

// Auto-delete logs older than 90 days
adminLoginLogSchema.index({ loggedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AdminLoginLog', adminLoginLogSchema);
