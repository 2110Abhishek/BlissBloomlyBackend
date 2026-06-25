// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const { globalLimiter } = require('./middleware/rateLimiters');
const logger = require('./utils/logger');

const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const ordersRouter = require('./routes/orders');
const paymentRouter = require('./routes/payment');
const adminRouter = require('./routes/admin');
const usersRouter = require('./routes/users');
const sellersRouter = require('./routes/sellers'); // New Route

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blissbloomly';

console.log("Using MONGO_URI:", MONGO_URI);

// DEBUG: Check if Email Env vars are loaded
console.log("Email User Loaded:", process.env.EMAIL_USER ? "YES" : "NO");
console.log("Email Pass Length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "0", "(Should be 16)");

// Trust proxy if running behind load balancers/reverse proxies (e.g. Heroku, AWS, Nginx)
app.set('trust proxy', 1);

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Middleware
app.use(compression());
app.use(cors({ origin: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

// Disable caching for API
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Apply global rate limiter to all API routes
app.use('/api', globalLimiter);

// API routes
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/users', usersRouter);
app.use('/api/sellers', sellersRouter);
app.use('/api/coupons', require('./routes/coupons')); // New Route
app.use('/api/reviews', require('./routes/reviews')); // Reviews Route
app.use('/api/seller/dashboard', require('./routes/sellerDashboard')); // New Route
app.use('/api/subscribers', require('./routes/subscribers')); // New Route

const notificationsRouter = require('./routes/notifications');
app.use('/api/notifications', notificationsRouter);
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/chatbot', require('./routes/chatbot'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Config endpoint for frontend (Public Keys)
app.get('/api/config', (req, res) => {
  res.json({
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID
    },
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY
  });
});

// Serve frontend build (optional)
app.use(express.static(path.join(__dirname, 'public')));

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
  });
});

// DB connect + server start
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('MongoDB connected');
    
    // Start Automation only after DB connects
    const startOrderScheduler = require('./utils/orderScheduler');
    startOrderScheduler();

    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

