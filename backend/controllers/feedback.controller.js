/* =============================================
   BLAZE KITCHEN — feedback.controller.js
   ============================================= */

const Feedback = require('../models/Feedback.model');
const sse      = require('../sse');

/* ────────────────────────────────────────────
   POST /api/feedback   — public (no auth)
   Submit a contact / feedback message
   ──────────────────────────────────────────── */
exports.submitFeedback = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    }

    const fb = await Feedback.create({ name, email, phone, subject, message });

    // Push live notification to any connected admin
    sse.broadcast('new-feedback', {
      id:      fb._id,
      name:    fb.name,
      subject: fb.subject,
      preview: fb.message.substring(0, 60)
    });

    res.status(201).json({ success: true, message: 'Thank you! Your message has been received.' });
  } catch (err) { next(err); }
};

/* ────────────────────────────────────────────
   GET /api/admin/feedback   — admin only
   List all feedback messages, newest first
   ──────────────────────────────────────────── */
exports.getAllFeedbacks = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    const unreadCount = await Feedback.countDocuments({ status: 'unread' });
    res.json({ success: true, data: feedbacks, unreadCount });
  } catch (err) { next(err); }
};

/* ────────────────────────────────────────────
   PATCH /api/admin/feedback/:id/status  — admin only
   Mark as read / replied
   ──────────────────────────────────────────── */
exports.updateFeedbackStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const fb = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!fb) return res.status(404).json({ success: false, message: 'Feedback not found.' });
    res.json({ success: true, data: fb });
  } catch (err) { next(err); }
};
