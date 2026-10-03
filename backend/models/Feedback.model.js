/* =============================================
   BLAZE KITCHEN — Feedback.model.js
   Stores contact/feedback messages from users
   ============================================= */

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, trim: true, lowercase: true },
  phone:   { type: String, trim: true, default: '' },
  subject: { type: String, default: 'General Inquiry' },
  message: { type: String, required: true, trim: true },
  status:  { type: String, enum: ['unread', 'read', 'replied'], default: 'unread' }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
