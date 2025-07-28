const express = require("express");
const { updateProfileValidation, changePasswordValidation } = require("../middleware/validators");
const router = express.Router();
const userController = require("../controllers/userController");
const upload = require('../middleware/multer');
const driverMiddleware = require('../middleware/driverMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

/**
 * User management routes
 * @module routes/userRoutes
 * @description API routes for user profile management, authentication, and admin operations
 */

/**
 * Get user profile by ID
 * 
 * @name GET /getProfile/:userId
 * @function
 * @memberof module:routes/userRoutes
 * @param {string} :userId - ID of the user to retrieve profile for
 * @param {Function} driverMiddleware - Authentication middleware for drivers
 * @param {Function} updateProfileValidation - Input validation middleware
 * @param {Function} userController.getProfile - Controller function to retrieve user profile
 * @returns {Object} JSON response with user profile data or error message
 */
router.get('/getProfile/:userId', driverMiddleware, updateProfileValidation, userController.getProfile);

/**
 * Upload user avatar/profile image
 * 
 * @name PATCH /uploadAvatar
 * @function
 * @memberof module:routes/userRoutes
 * @param {Function} driverMiddleware - Authentication middleware for drivers
 * @param {Function} upload.single - Multer middleware for handling file upload
 * @param {Function} userController.uploadAvatar - Controller function to process avatar upload
 * @returns {Object} JSON response with profile image path or error message
 */
router.patch('/uploadAvatar', driverMiddleware, upload.single('avatar'), userController.uploadAvatar);

/**
 * Change user password
 * 
 * @name PATCH /changePassword
 * @function
 * @memberof module:routes/userRoutes
 * @param {Function} driverMiddleware - Authentication middleware for drivers
 * @param {Function} changePasswordValidation - Input validation middleware
 * @param {Function} userController.changePassword - Controller function to handle password change
 * @returns {Object} JSON response with success status or error message
 */
router.patch('/changePassword', driverMiddleware, changePasswordValidation, userController.changePassword);

/**
 * Update the authenticated user's own profile
 * 
 * @name PATCH /updateProfile
 * @function
 * @memberof module:routes/userRoutes
 * @param {Function} driverMiddleware - Authentication middleware for drivers
 * @param {Function} userController.updateProfile - Controller function to update user's own profile
 * @returns {Object} JSON response with updated user data or error message
 */
router.patch('/updateProfile', driverMiddleware, userController.updateProfile);

/**
 * Update a user's profile (admin only)
 * 
 * @name PATCH /updateUserProfile/:id
 * @function
 * @memberof module:routes/userRoutes
 * @param {string} :id - ID of the user to update
 * @param {Function} adminMiddleware - Authentication middleware for admins
 * @param {Function} userController.updateUserProfile - Controller function to update user profile
 * @returns {Object} JSON response with updated user data or error message
 */
router.patch('/updateUserProfile/:id', adminMiddleware, userController.updateUserProfile);

/**
 * Get all users with optional filtering
 * 
 * @name GET /getUsers
 * @function
 * @memberof module:routes/userRoutes
 * @param {Object} req.query - Optional query parameters for filtering
 * @param {string} [req.query.role] - Filter users by role (admin/driver)
 * @param {string} [req.query.search] - Search term to filter users
 * @param {Function} userController.getUsers - Controller function to retrieve users
 * @returns {Object} JSON response with users data and stats or error message
 */
router.get('/getUsers',adminMiddleware, userController.getUsers);

/**
 * Export drivers data to CSV (admin only)
 * 
 * @name GET /exportDrivers
 * @function
 * @memberof module:routes/userRoutes
 * @param {Function} adminMiddleware - Authentication middleware for admins
 * @param {Function} userController.exportDrivers - Controller function to export drivers data
 * @returns {File|Object} CSV file download or JSON error message
 */
router.get('/exportDrivers', adminMiddleware, userController.exportDrivers);

module.exports = router;