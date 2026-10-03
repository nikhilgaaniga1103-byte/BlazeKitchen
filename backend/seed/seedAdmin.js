/* =============================================
   BLAZE KITCHEN — seed/seedAdmin.js
   Safely creates / updates the admin account.
   Safe to run anytime — won't duplicate.

   Usage:
     cd backend
     npm run seed:admin
   ============================================= */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User.model');

const ADMIN_CREDENTIALS = {
  name    : 'Blaze Admin',
  email   : 'admin@blazekitchen.com',
  password: 'Admin@123',
  role    : 'admin'
};

const ensureAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN_CREDENTIALS.email });

    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log(`🔧 Promoted existing account to admin: ${ADMIN_CREDENTIALS.email}`);
      } else {
        console.log(`✅ Admin already exists in DB: ${ADMIN_CREDENTIALS.email}`);
      }
    } else {
      // Create fresh — pre-save hook will hash the password
      await User.create(ADMIN_CREDENTIALS);
      console.log(`👤 Admin account created: ${ADMIN_CREDENTIALS.email}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ADMIN LOGIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Email   : ${ADMIN_CREDENTIALS.email}`);
    console.log(`  Password: ${ADMIN_CREDENTIALS.password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ seedAdmin failed:', err.message);
    process.exit(1);
  }
};

ensureAdmin();
