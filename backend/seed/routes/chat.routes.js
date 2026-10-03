/* =============================================
   BLAZE KITCHEN - chat.routes.js
   ============================================= */

const express = require('express');
const router = express.Router();
const { chatWithOllama } = require('../controllers/chat.controller');

// POST /api/chat/ollama
router.post('/ollama', chatWithOllama);

module.exports = router;
