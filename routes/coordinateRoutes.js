const express = require("express");
const router = express.Router();
const coordinateController = require("../controllers/coordinateController");
const driverMiddleware = require("../middleware/driverMiddleware");

/**
 * Update live coordinates for a job
 * 
 * @name PATCH /updateCoord/:jobId
 * @function
 * @memberof module:routes/coordinateRoutes
 * @param {string} :jobId - ID of the job to update coordinates for
 * @param {Function} driverMiddleware - Authentication middleware for drivers
 * @param {Function} coordinateController.updateLiveCoordinate - Controller function to update coordinates
 * @returns {Object} JSON response with updated job data or error message
 */
router.patch('/updateCoord/:jobId', driverMiddleware, coordinateController.updateLiveCoordinate);

/**
 * Retrieve current live coordinates for a job
 * 
 * @name GET /getLiveCoord/:jobId
 * @function
 * @memberof module:routes/coordinateRoutes
 * @param {string} :jobId - ID of the job to get coordinates for
 * @param {Function} driverMiddleware - Authentication middleware for drivers
 * @param {Function} coordinateController.getLiveCoordinate - Controller function to get live coordinates
 * @returns {Object} JSON response with current coordinate data or error message
 */
router.get('/getLiveCoord/:jobId', driverMiddleware, coordinateController.getLiveCoordinate);

/**
 * Retrieve pickup and dropoff coordinates for a job
 * 
 * @name GET /getCoord/:jobId
 * @function
 * @memberof module:routes/coordinateRoutes
 * @param {string} :jobId - ID of the job to get coordinates for
 * @param {Function} driverMiddleware - Authentication middleware for drivers
 * @param {Function} coordinateController.getCoordinates - Controller function to get pickup/dropoff coordinates
 * @returns {Object} JSON response with pickup and dropoff coordinate data or error message
 */
router.get('/getCoord/:jobId', driverMiddleware, coordinateController.getCoordinates);

/**
 * Retrieve all coordinates (pickup, dropoff, current) for a job
 * This endpoint is public and doesn't require authentication
 * 
 * @name GET /getAllCoord/:jobId
 * @function
 * @memberof module:routes/coordinateRoutes
 * @param {string} :jobId - ID of the job to get all coordinates for
 * @param {Function} coordinateController.getAllCoordinates - Controller function to get all coordinates
 * @returns {Object} JSON response with all coordinate data or error message
 */
router.get('/getAllCoord/:jobId', coordinateController.getAllCoordinates);

/**
 * Coordinate routes
 * @module routes/coordinateRoutes
 * @description API routes for managing and retrieving job coordinates
 */
module.exports = router;