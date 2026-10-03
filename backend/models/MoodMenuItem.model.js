/* =============================================
   BLAZE KITCHEN — models/MoodMenuItem.model.js
   Admin-managed mood mapping for menu items
   ============================================= */

const mongoose = require('mongoose');

const MOOD_SLUGS = [
  'stressed',
  'gym',
  'sick',
  'celebration',
  'office-rush',
  'late-night',
  'study-mode',
];

const FOOD_PREFERENCES = ['veg', 'non-veg', 'both'];

const moodMenuItemSchema = new mongoose.Schema(
  {
    // Snapshot reference to nested menu structure
    menuCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', default: null },
    menuSubcategoryId: { type: mongoose.Schema.Types.ObjectId, default: null },
    menuItemId: { type: mongoose.Schema.Types.ObjectId, default: null },

    // Snapshot fields (kept for resilience even if menu structure changes)
    categoryName: { type: String, default: '', trim: true },
    subcategoryName: { type: String, default: '', trim: true },
    itemName: { type: String, required: true, trim: true },
    image_url: { type: String, default: '' },

    price: { type: Number, required: true, min: 0, default: 0 },
    foodPreference: { type: String, enum: FOOD_PREFERENCES, default: 'both' },

    moods: {
      type: [String],
      enum: MOOD_SLUGS,
      default: [],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one mood category is required.',
      },
    },

    calories: { type: Number, min: 0, default: 0 },
    protein: { type: Number, min: 0, default: 0 },
    prepTime: { type: Number, min: 0, default: 0 }, // minutes

    tags: { type: [String], default: [] },
    shortReason: { type: String, default: '', trim: true, maxlength: 240 },
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

moodMenuItemSchema.index({ moods: 1, isEnabled: 1 });
moodMenuItemSchema.index({ foodPreference: 1, price: 1 });
moodMenuItemSchema.index({ menuItemId: 1 });

module.exports = mongoose.model('MoodMenuItem', moodMenuItemSchema);
module.exports.MOOD_SLUGS = MOOD_SLUGS;
module.exports.FOOD_PREFERENCES = FOOD_PREFERENCES;
