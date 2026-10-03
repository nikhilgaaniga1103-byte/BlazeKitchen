/* =============================================
   BLAZE KITCHEN — models/SiteSettings.model.js
   Stores site-wide settings (contact info, hours, etc.)
   ============================================= */

const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  // Only one document — use a fixed key
  key: {
    type: String,
    default: 'site_settings',
    unique: true,
    immutable: true
  },

  phone: {
    type: String,
    default: '+91 9876543210'
  },

  emails: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  hours: {
    // Main operating hours
    mainHours: {
      type: String,
      default: 'Mon–Sun: 11AM – 11PM'
    },
    // Late night hours (optional)
    lateNight: {
      type: String,
      default: 'Late Night: Till 2AM'
    }
  },

  address: {
    type: String,
    default: 'Near Sub-urban Bus Shuttle, Keshava Iyengar Rd, Mysore'
  },

  // Delivery simulation tuning (kept in a strict 2-3 minute window)
  deliveryTiming: {
    minMinutes: {
      type: Number,
      default: 2,
      min: 2,
      max: 3
    },
    maxMinutes: {
      type: Number,
      default: 3,
      min: 2,
      max: 3
    },
    qtyWeight: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    },
    varietyWeight: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1
    }
  }

}, {
  timestamps: true
});

// Ensure only one settings document exists
siteSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: 'site_settings' });
  if (!settings) {
    settings = await this.create({
      key: 'site_settings',
      phone: '+91 9876543210',
      emails: ['hello@blazekitchen.com', 'orders@blazekitchen.com'],
      hours: {
        mainHours: 'Mon–Sun: 11AM – 11PM',
        lateNight: 'Late Night: Till 2AM'
      },
      address: 'Near Sub-urban Bus Shuttle, Keshava Iyengar Rd, Mysore',
      deliveryTiming: {
        minMinutes: 2,
        maxMinutes: 3,
        qtyWeight: 0.7,
        varietyWeight: 0.3
      }
    });
  }
  return settings;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
