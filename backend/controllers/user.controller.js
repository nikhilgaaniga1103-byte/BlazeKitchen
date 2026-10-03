/* =============================================
   BLAZE KITCHEN — controllers/user.controller.js
   ============================================= */

const User = require('../models/User.model');

/**
 * @route   GET /api/users
 * @access  Admin only
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count  : users.length,
      data   : { users }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/users/:id
 * @access  Admin only
 */
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/users/:id
 * @access  Admin only
 */
exports.deleteUser = async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Admins cannot delete their own account.'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: `User "${user.email}" has been deleted.`,
      data   : null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/users/:id/role
 * @access  Admin only
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Use "user" or "admin".' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      message: `${user.email}'s role updated to "${role}".`,
      data   : { user }
    });
  } catch (err) {
    next(err);
  }
};
