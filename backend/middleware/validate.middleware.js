/* =============================================
   BLAZE KITCHEN — middleware/validate.middleware.js
   ============================================= */

const { validationResult } = require('express-validator');

/**
 * Runs after express-validator checks.
 * If errors exist, returns 400 with all messages.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors : errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

module.exports = validate;
