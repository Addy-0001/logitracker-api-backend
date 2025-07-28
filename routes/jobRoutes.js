const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const adminMiddleware = require('../middleware/adminMiddleware');

/**
 * Job management routes
 * @module routes/jobRoutes
 * @description API routes for creating, retrieving, and managing delivery jobs
 */

/**
 * Create a new job
 * 
 * @name POST /createJob
 * @function
 * @memberof module:routes/jobRoutes
 * @param {Function} adminMiddleware - Authentication middleware for admin users
 * @param {Function} jobController.createJob - Controller function to handle job creation
 * @returns {Object} JSON response with created job data or error message
 */
router.post('/createJob', adminMiddleware, jobController.createJob);

/**
 * Retrieve all jobs with optional filtering
 * 
 * @name GET /
 * @function
 * @memberof module:routes/jobRoutes
 * @param {Object} req.query - Optional query parameters for filtering
 * @param {string} [req.query.status] - Filter jobs by status
 * @param {string} [req.query.search] - Search term to filter jobs
 * @param {Function} jobController.getJobs - Controller function to retrieve jobs
 * @returns {Object} JSON response with jobs data or error message
 */
router.get('/', jobController.getJobs);

/**
 * Retrieve all jobs for a specific driver
 * 
 * @name GET /getJobForDriver/:driverId
 * @function
 * @memberof module:routes/jobRoutes
 * @param {string} :driverId - ID of the driver to get jobs for
 * @param {Function} jobController.getJobsForDriver - Controller function to get driver's jobs
 * @returns {Object} JSON response with driver's jobs or error message
 */
router.get('/getJobForDriver/:driverId', jobController.getJobsForDriver);

/**
 * Retrieve a specific job by ID
 * 
 * @name GET /getJobById/:jobId
 * @function
 * @memberof module:routes/jobRoutes
 * @param {string} :jobId - ID of the job to retrieve
 * @param {Function} jobController.getJobById - Controller function to get job by ID
 * @returns {Object} JSON response with job data or error message
 */
router.get('/getJobById/:jobId', jobController.getJobById);

/**
 * Update the status of a job
 * 
 * @name PATCH /:jobId/status
 * @function
 * @memberof module:routes/jobRoutes
 * @param {string} :jobId - ID of the job to update
 * @param {Object} req.body - Request body
 * @param {string} req.body.status - New status for the job
 * @param {Function} adminMiddleware - Authentication middleware for admin users
 * @param {Function} jobController.updateStatus - Controller function to update job status
 * @returns {Object} JSON response with updated job data or error message
 */
router.patch('/:jobId/status', adminMiddleware, jobController.updateStatus);

/**
 * Generate PDF report for a specific job
 * 
 * @name GET /generate-pdf/:id
 * @function
 * @memberof module:routes/jobRoutes
 * @param {string} :id - ID of the job to generate PDF for
 * @param {Function} jobController.generateJobPDF - Controller function to generate PDF
 * @returns {Object} JSON response with PDF file path or error message
 */
router.get('/generate-pdf/:id', jobController.generateJobPDF);

module.exports = router;