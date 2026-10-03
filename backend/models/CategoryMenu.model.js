/* =============================================
   BLAZE KITCHEN — models/CategoryMenu.model.js
   Structured menu: category → subcategories → items
   ============================================= */

const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name      : { type: String, required: true, trim: true },
    prices    : { type: [Number], required: true },
    image_url : { type: String, default: '' },
    note      : { type: String, default: '' },
    available : { type: Boolean, default: true }
  },
  { _id: false }
);

const subcategorySchema = new mongoose.Schema(
  {
    name  : { type: String, required: true, trim: true },
    items : { type: [menuItemSchema], default: [] }
  },
  { _id: false }
);

const categoryMenuSchema = new mongoose.Schema(
  {
    category      : { type: String, required: true, trim: true },
    subcategories : { type: [subcategorySchema], default: [] },
    image         : { type: String, default: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80' },
    badge         : { type: String, default: '' },
    availability  : { type: Boolean, default: true }
  },
  { timestamps: true }
);

categoryMenuSchema.index({ category: 1 });
categoryMenuSchema.index({ availability: 1 });

module.exports = mongoose.model('CategoryMenu', categoryMenuSchema);
