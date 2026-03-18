import rateLimit from 'express-rate-limit';

/**
 * Limit login attempts to 10 per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    // Note: express-rate-limit 6+ provides resetTime or we can calculate from window
    res.status(options.statusCode).json({
      message: 'Too many login attempts. Please wait a moment before trying again.'
    });
  }
});

/**
 * Limit registration attempts to 5 per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    message: 'Too many registration attempts. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      message: 'Too many registration attempts. Please wait a moment before trying again.'
    });
  }
});
