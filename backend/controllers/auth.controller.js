/* =============================================
   BLAZE KITCHEN — controllers/auth.controller.js
   ============================================= */

const User           = require('../models/User.model');
const AdminLoginLog  = require('../models/AdminLoginLog.model');

/**
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Prevent self-assigning admin role via API
    const safeRole = role === 'admin' ? 'user' : (role || 'user');

    const user = await User.create({ name, email, password, role: safeRole });
    const token = user.generateToken();

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      data   : { user }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) Find user with password field (select: false by default)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 2) Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Log failed admin login attempt
      if (user.role === 'admin') {
        await AdminLoginLog.create({
          adminId   : user._id,
          name      : user.name,
          email     : user.email,
          ip        : req.ip || req.headers['x-forwarded-for'] || 'unknown',
          userAgent : req.headers['user-agent'] || 'unknown',
          status    : 'failed',
          failReason: 'Incorrect password'
        }).catch(() => {});
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 3) Generate token
    const token = user.generateToken();

    // 4) Update last-login stats & log admin logins in DB
    user.lastLogin  = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save({ validateBeforeSave: false });

    if (user.role === 'admin') {
      await AdminLoginLog.create({
        adminId  : user._id,
        name     : user.name,
        email    : user.email,
        ip       : req.ip || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status   : 'success'
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      data   : { user }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/auth/me
 * @access  Protected
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data   : { user }
    });
  } catch (err) {
    next(err);
  }
};
