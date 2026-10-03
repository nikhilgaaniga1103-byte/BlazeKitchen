/* =============================================
   BLAZE KITCHEN — middleware/auth.middleware.js
   ============================================= */

const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');

/**
 * protect — verifies JWT and attaches user to req
 */
exports.protect = async (req, res, next) => {
  try {
    // 1) Check Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // 2) Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.name === 'TokenExpiredError'
          ? 'Session expired. Please login again.'
          : 'Invalid token. Please login again.'
      });
    }

    // 3) Check user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.'
      });
    }

    // 4) Attach user to request
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * restrictTo — role-based access control
 * Usage: restrictTo('admin')
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.'
      });
    }
    next();
  };
};
