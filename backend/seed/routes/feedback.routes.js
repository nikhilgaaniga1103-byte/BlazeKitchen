/* =============================================
   BLAZE KITCHEN — feedback.routes.js
   Public endpoint for contact/feedback form submission
   ============================================= */

const express  = require('express');
const router   = express.Router();
const { submitFeedback } = require('../controllers/feedback.controller');

// POST /api/feedback  — anyone can submit (no auth required)
router.post('/', submitFeedback);

module.exports = router;
