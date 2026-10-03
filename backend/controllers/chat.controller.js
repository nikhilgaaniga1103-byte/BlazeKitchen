/* =============================================
   BLAZE KITCHEN - chat.controller.js
   Ollama-backed support chat endpoint
   ============================================= */

const axios = require('axios');
const Menu = require('../models/Menu.model');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const BASE_SYSTEM_PROMPT = [
  'You are Blaze Kitchen AI support assistant.',
  'Be concise, friendly, and practical.',
  'Do not invent unavailable offers or policies.',
  'Keep your responses short and natural.',
  'If unsure, clearly say so and suggest contacting human support.'
].join(' ');

function fallbackReply(userMessage) {
  const text = String(userMessage || '').toLowerCase();
  if (text.includes('time') || text.includes('open') || text.includes('close') || text.includes('timing')) {
    return 'Our usual timings are 8:00 AM to 11:00 PM. If the kitchen is closed now, the countdown on screen shows next opening time.';
  }
  if (text.includes('delivery') || text.includes('how long') || text.includes('eta')) {
    return 'Delivery typically takes around 25-30 minutes depending on distance and order volume.';
  }
  if (text.includes('offer') || text.includes('discount') || text.includes('coupon') || text.includes('code')) {
    return 'Current offers can vary. Please check the latest promo banners on the home page before checkout.';
  }
  if (text.includes('menu') || text.includes('recommend') || text.includes('popular')) {
    return 'Popular picks include burgers, pasta, and signature shakes. Open the Menu section to see categories and live pricing.';
  }
  return 'I can help with menu, offers, delivery ETA, and kitchen timings. Ask me anything about your order.';
}

async function getInstalledModels() {
  const tagsRes = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });

  const models = (tagsRes?.data?.models || [])
    .map((m) => m?.name)
    .filter(Boolean);

  return models;
}

async function chatWithModel(model, messages) {
  return axios.post(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      model,
      messages,
      stream: false
    },
    {
      timeout: 45000,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

exports.chatWithOllama = async (req, res, next) => {
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Chat message is required.'
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
          .slice(-10)
      : [];

    const menuData = await Menu.find({ availability: true }).lean();
    let menuContext = 'Current Menu Details: ';
    if (menuData && menuData.length > 0) {
      menuContext += menuData.map(cat => {
        let catStr = `[Category: ${cat.category}] `;
        if (cat.subcategories) {
          cat.subcategories.forEach(sub => {
            if (sub.items) {
              const activeItems = sub.items.filter(i => i.available).map(i => `${i.name} (₹${i.prices?.[0] || 0})`);
              if (activeItems.length > 0) catStr += `${sub.name}: ${activeItems.join(', ')}. `;
            }
          });
        }
        return catStr;
      }).join(' | ');
    } else {
      menuContext += 'Menu is currently being updated.';
    }

    const messages = [
      { role: 'system', content: `${BASE_SYSTEM_PROMPT} Project Data: ${menuContext}` },
      ...safeHistory,
      { role: 'user', content: message.trim() }
    ];

    let response;
    let usedModel = OLLAMA_MODEL;

    try {
      response = await chatWithModel(OLLAMA_MODEL, messages);
    } catch (err) {
      const ollamaErr = err?.response?.data?.error || '';
      const modelMissing = typeof ollamaErr === 'string' && ollamaErr.includes('not found');

      if (!modelMissing) throw err;

      // If configured model is missing, fallback to first installed model.
      const availableModels = await getInstalledModels();
      if (!availableModels.length) {
        return res.json({
          success: true,
          model: 'fallback',
          warning: `No Ollama models installed. Run: ollama pull ${OLLAMA_MODEL}`,
          reply: fallbackReply(message)
        });
      }

      usedModel = availableModels[0];
      response = await chatWithModel(usedModel, messages);
    }

    const reply = response?.data?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({
        success: false,
        message: 'AI response was empty. Please try again.'
      });
    }

    return res.json({
      success: true,
      model: usedModel,
      reply
    });
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
      return res.json({
        success: true,
        model: 'fallback',
        warning: 'Ollama is not reachable. Start Ollama to enable AI responses.',
        reply: fallbackReply(req.body?.message)
      });
    }

    if (err.response?.data?.error) {
      const availableModels = await getInstalledModels().catch(() => []);
      const availableText = availableModels.length
        ? ` Available models: ${availableModels.join(', ')}`
        : ' No models detected. Run: ollama pull llama3.2';

      return res.status(502).json({
        success: false,
        message: `Ollama error: ${err.response.data.error}.${availableText}`
      });
    }

    return next(err);
  }
};
