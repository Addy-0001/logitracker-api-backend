const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { signUpValidation, loginValidation } = require("../middleware/validators");

/**
 * Rate limiter for login attempts
 * Prevents brute force attacks by limiting the number of login attempts
 * 
 * @constant {Function} loginLimiter
 * @property {number} windowMs - Time window in milliseconds (15 minutes)
 * @property {number} max - Maximum number of requests allowed per IP in the time window
 * @property {string} message - Response message when limit is exceeded
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: 'Too many login attempts, try again later'
});

/**
 * Rate limiter for signup attempts
 * Prevents abuse by limiting the number of registration attempts
 * 
 * @constant {Function} signUpLimiter
 * @property {number} windowMs - Time window in milliseconds (15 minutes)
 * @property {number} max - Maximum number of requests allowed per IP in the time window
 * @property {string} message - Response message when limit is exceeded
 */
const signUpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many registration attempts, try again later'
});

/**
 * Route for user registration (signup)
 * 
 * @name POST /auth/signup
 * @function
 * @memberof module:routes/authRoutes
 * @param {Function} signUpLimiter - Rate limiting middleware
 * @param {Function} signUpValidation - Input validation middleware
 * @param {Function} authController.signup - Controller function to handle signup logic
 * @returns {Object} JSON response with success status and message
 */
router.post('/signup', signUpLimiter, signUpValidation, authController.signup);

/**
 * Route for driver authentication
 * 
 * @name POST /auth/driver-login
 * @function
 * @memberof module:routes/authRoutes
 * @param {Function} loginLimiter - Rate limiting middleware
 * @param {Function} loginValidation - Input validation middleware
 * @param {Function} authController.driverLogin - Controller function to handle driver login
 * @returns {Object} JSON response with token and user data
 */
router.post('/driver-login', loginLimiter, loginValidation, authController.driverLogin);

/**
 * Route for admin authentication
 * 
 * @name POST /auth/admin-login
 * @function
 * @memberof module:routes/authRoutes
 * @param {Function} loginLimiter - Rate limiting middleware
 * @param {Function} loginValidation - Input validation middleware
 * @param {Function} authController.adminLogin - Controller function to handle admin login
 * @returns {Object} JSON response with token and user data
 */
router.post('/admin-login', loginLimiter, loginValidation, authController.adminLogin);

/**
 * Authentication routes
 * @module routes/authRoutes
 */
module.exports = router;