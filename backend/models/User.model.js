/* =============================================
   BLAZE KITCHEN — models/User.model.js
   ============================================= */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type     : String,
      required : [true, 'Name is required'],
      trim     : true,
      minlength: [2,  'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type    : String,
      required: [true, 'Email is required'],
      unique  : true,
      trim    : true,
      lowercase: true,
      match   : [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
      type     : String,
      required : [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select   : false   // Never return password in queries by default
    },
    role: {
      type   : String,
      enum   : ['user', 'admin'],
      default: 'user'
    },
    lastLogin: {
      type   : Date,
      default: null
    },
    loginCount: {
      type   : Number,
      default: 0
    }
  },
  { timestamps: true }
);

// ── Hash password before saving ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance method: compare passwords ──
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance method: generate JWT ──
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── Remove sensitive fields from JSON output ──
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
