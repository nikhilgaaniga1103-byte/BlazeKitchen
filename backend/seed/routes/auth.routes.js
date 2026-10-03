/* =============================================
   BLAZE KITCHEN — routes/auth.routes.js
   ============================================= */

const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();

const authController = require('../controllers/auth.controller');
const { protect }    = require('../middleware/auth.middleware');
const validate       = require('../middleware/validate.middleware');

// ── Validation Rules ──
const registerRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// ── Routes ──
// POST /api/auth/register
router.post('/register', registerRules, validate, authController.register);

// POST /api/auth/login
router.post('/login', loginRules, validate, authController.login);

// GET /api/auth/me  (protected)
router.get('/me', protect, authController.getMe);

module.exports = router;
