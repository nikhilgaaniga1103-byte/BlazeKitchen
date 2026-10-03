/* =============================================
   BLAZE KITCHEN — models/MoodCategory.model.js
   Mood taxonomy with enable/disable control
   ============================================= */

const mongoose = require('mongoose');

const moodCategorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 40,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 180,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MoodCategory', moodCategorySchema);
