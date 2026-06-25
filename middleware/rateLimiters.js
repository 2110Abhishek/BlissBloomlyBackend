const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// 1. Global API Limiter
// Protects the general API from excessive requests and basic scraping.
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
        logger.warn(`Unusual traffic detected: Global API rate limit exceeded by IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

// 2. Strict Auth Limiter
// Prevents credential stuffing, brute force, and mass account creation.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many authentication attempts from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn(`Auth abuse detected: Auth rate limit exceeded by IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

// 3. AI Generation Limiter
// Prevents abuse of the Chatbot or Recommendation endpoints (cost/resource control).
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // Limit each IP to 15 requests per windowMs
    message: {
        error: 'You are making too many requests to the AI service. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn(`AI abuse detected: AI endpoint rate limit exceeded by IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

module.exports = {
    globalLimiter,
    authLimiter,
    aiLimiter
};
