/* =============================================
   BLAZE KITCHEN — routes/user.routes.js
   ============================================= */

const express = require('express');
const router  = express.Router();

const userController          = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// All user management routes are admin-only
router.use(protect, restrictTo('admin'));

// GET /api/users         — list all users
router.get('/', userController.getAllUsers);

// GET /api/users/:id     — get single user
router.get('/:id', userController.getUserById);

// PUT /api/users/:id/role — change user role
router.put('/:id/role', userController.updateUserRole);

// DELETE /api/users/:id  — delete user
router.delete('/:id', userController.deleteUser);

module.exports = router;
