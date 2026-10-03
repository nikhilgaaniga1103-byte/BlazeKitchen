/* =============================================
   BLAZE KITCHEN — controllers/settings.controller.js
   Site settings CRUD (phone, email, hours)
   ============================================= */

const SiteSettings = require('../models/SiteSettings.model');
const sse = require('../sse');

const AUTO_RESTART_ON_ADMIN_CHANGE =
  (process.env.AUTO_RESTART_ON_ADMIN_CHANGE
    || (((process.env.NODE_ENV || 'development') === 'development') ? 'true' : 'false')) === 'true';

function scheduleBackendRestart(reason) {
  if (!AUTO_RESTART_ON_ADMIN_CHANGE) return;

  const delayMs = Number(process.env.ADMIN_CHANGE_RESTART_DELAY_MS) || 700;
  setTimeout(() => {
    console.warn(`⚠️  Restarting backend: ${reason}`);
    process.exit(0);
  }, Math.max(250, delayMs));
}

/* ── Get current settings (public — used by frontend) ── */
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

/* ── Update settings (admin only) ── */
exports.updateSettings = async (req, res, next) => {
  try {
    const { phone, emails, hours, address, deliveryTiming } = req.body;
    let settings = await SiteSettings.getSettings();

    if (phone !== undefined)   settings.phone   = phone;
    if (emails !== undefined)  settings.emails  = emails;
    if (address !== undefined) settings.address = address;
    if (hours !== undefined) {
      if (hours.mainHours !== undefined) settings.hours.mainHours = hours.mainHours;
      if (hours.lateNight !== undefined) settings.hours.lateNight = hours.lateNight;
    }

    if (deliveryTiming !== undefined) {
      const currentTiming = settings.deliveryTiming || {};
      const minMinutes = Number(
        deliveryTiming.minMinutes !== undefined ? deliveryTiming.minMinutes : currentTiming.minMinutes
      );
      const maxMinutes = Number(
        deliveryTiming.maxMinutes !== undefined ? deliveryTiming.maxMinutes : currentTiming.maxMinutes
      );
      const qtyWeight = Number(
        deliveryTiming.qtyWeight !== undefined ? deliveryTiming.qtyWeight : currentTiming.qtyWeight
      );
      const varietyWeight = Number(
        deliveryTiming.varietyWeight !== undefined ? deliveryTiming.varietyWeight : currentTiming.varietyWeight
      );

      if (!Number.isFinite(minMinutes) || minMinutes < 2 || minMinutes > 3) {
        return res.status(400).json({ success: false, message: 'minMinutes must be between 2 and 3' });
      }
      if (!Number.isFinite(maxMinutes) || maxMinutes < 2 || maxMinutes > 3) {
        return res.status(400).json({ success: false, message: 'maxMinutes must be between 2 and 3' });
      }
      if (maxMinutes < minMinutes) {
        return res.status(400).json({ success: false, message: 'maxMinutes must be greater than or equal to minMinutes' });
      }

      const q = Number.isFinite(qtyWeight) ? qtyWeight : 0.7;
      const v = Number.isFinite(varietyWeight) ? varietyWeight : 0.3;
      const qClamped = Math.max(0, Math.min(1, q));
      const vClamped = Math.max(0, Math.min(1, v));
      const weightSum = qClamped + vClamped;

      settings.deliveryTiming.minMinutes = minMinutes;
      settings.deliveryTiming.maxMinutes = maxMinutes;
      settings.deliveryTiming.qtyWeight = weightSum > 0 ? (qClamped / weightSum) : 0.7;
      settings.deliveryTiming.varietyWeight = weightSum > 0 ? (vClamped / weightSum) : 0.3;
    }

    await settings.save();

    sse.broadcastAll('settings-updated', {
      phone: settings.phone,
      emails: settings.emails,
      hours: settings.hours,
      address: settings.address,
      deliveryTiming: settings.deliveryTiming
    });

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });

    scheduleBackendRestart('admin settings updated');
  } catch (err) {
    next(err);
  }
};
