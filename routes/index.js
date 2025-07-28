const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const jobRoutes = require('./jobRoutes');
const coordinateRoutes = require('./coordinateRoutes');
const userRoutes = require('../routes/userRoutes');

/**
 * Central router module that combines all application routes
 * @module routes/index
 * 
 * @description
 * This module serves as the main entry point for all API routes.
 * It imports individual route modules and mounts them at their
 * respective path prefixes. This creates a well-organized
 * hierarchical API structure.
 */

/**
 * Authentication routes - handles user registration, login, etc.
 * @name auth-routes
 * @path {GET|POST} /auth
 */
router.use('/auth', authRoutes);

/**
 * Job management routes - handles job creation, updates, queries, etc.
 * @name job-routes
 * @path {GET|POST|PATCH|DELETE} /job
 */
router.use('/job', jobRoutes);

/**
 * Coordinate tracking routes - handles location updates and queries
 * @name coordinate-routes
 * @path {GET|PATCH} /coordinate
 */
router.use('/coordinate', coordinateRoutes);

/**
 * User management routes - handles user profile operations
 * @name user-routes
 * @path {GET|POST|PATCH|DELETE} /user
 */
router.use('/user', userRoutes);

module.exports = router;