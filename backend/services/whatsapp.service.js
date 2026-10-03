const axios = require('axios');

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

function buildTextMessage(messageData) {
  const customerName = messageData?.customerName || 'Customer';
  const orderId = messageData?.orderId || '-';
  const amount = messageData?.amount || '0.00';
  const estimatedDelivery = messageData?.estimatedDelivery || 'Will be shared shortly';
  const trackingLink = messageData?.trackingLink || '';

  return [
    `Hi ${customerName}, your order #${orderId} has been placed successfully.`,
    `Total: INR ${amount}.`,
    `Estimated delivery: ${estimatedDelivery}.`,
    trackingLink ? `Track here: ${trackingLink}` : ''
  ].filter(Boolean).join('\n');
}

function buildRequestPayload(phone, messageData) {
  const to = normalizePhone(phone);
  if (!to) throw new Error('Invalid WhatsApp recipient phone number');

  if (messageData?.templateName) {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: messageData.templateName,
        language: { code: messageData.languageCode || 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: String(messageData.customerName || 'Customer') },
              { type: 'text', text: String(messageData.orderId || '-') },
              { type: 'text', text: String(messageData.amount || '0.00') },
              { type: 'text', text: String(messageData.estimatedDelivery || 'Will be shared shortly') },
              { type: 'text', text: String(messageData.trackingLink || '') }
            ]
          }
        ]
      }
    };
  }

  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      preview_url: true,
      body: buildTextMessage(messageData)
    }
  };
}

async function sendWhatsAppMessage(phone, messageData, options = {}) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const maxRetries = Number.isInteger(options.maxRetries) ? options.maxRetries : 1;

  if (!accessToken || !phoneNumberId) {
    const error = 'Missing WhatsApp configuration: WHATSAPP_ACCESS_TOKEN or PHONE_NUMBER_ID';
    console.error(error);
    return { success: false, error };
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const payload = buildRequestPayload(phone, messageData);

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        to: payload.to,
        messageId: response.data?.messages?.[0]?.id || null,
        raw: response.data
      };
    } catch (err) {
      lastError = err;
      const apiError = err.response?.data?.error || null;
      const errorMessage = apiError?.message || err.message;

      console.error(`WhatsApp API attempt ${attempt + 1} failed:`, errorMessage);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Failed to send WhatsApp message',
    details: lastError?.response?.data || null
  };
}

module.exports = {
  sendWhatsAppMessage
};
