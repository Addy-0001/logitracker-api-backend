const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { verifyToken } = require('../middleware/auth');

// Apply middleware
router.use(verifyToken);

// Job routes
router.get('/', jobController.getJobs);
router.get('/summary', jobController.getSummary);
router.post('/', jobController.createJob);
router.get('/:id', jobController.getJobById);

module.exports = router;
