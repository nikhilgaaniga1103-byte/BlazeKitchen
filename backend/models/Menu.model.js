/* =============================================
   BLAZE KITCHEN — models/Menu.model.js
   Nested structure: Category → Subcategories → Items
   ============================================= */

const mongoose = require('mongoose');

/* ── Individual menu item inside a subcategory ── */
const itemSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  prices:    { type: [Number], default: [0] },
  image_url: { type: String, default: '' },
  available: { type: Boolean, default: true }
}, { _id: true });

/* ── Subcategory containing items ── */
const subcategorySchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  items: { type: [itemSchema], default: [] }
}, { _id: true });

/* ── Top-level category document ── */
const menuSchema = new mongoose.Schema(
  {
    category:      { type: String, required: true, trim: true },
    subcategories: { type: [subcategorySchema], default: [] },
    availability:  { type: Boolean, default: true }
  },
  { timestamps: true, strict: false }
);

menuSchema.index({ category: 1 });

module.exports = mongoose.model('Menu', menuSchema);
