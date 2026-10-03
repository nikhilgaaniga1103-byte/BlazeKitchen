/* =============================================
   BLAZE KITCHEN — middleware/error.middleware.js
   ============================================= */

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';

  // ── Mongoose Validation Error ──
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message    = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // ── Mongoose Duplicate Key ──
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  }

  // ── Mongoose Cast Error (bad ObjectId) ──
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = `Invalid ${err.path}: ${err.value}`;
  }

  // ── Log errors in development ──
  if (process.env.NODE_ENV === 'development') {
    console.error('💥 ERROR:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
