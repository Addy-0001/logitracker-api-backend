const Job = require('../models/job.model');
const User = require('../models/user.model');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

/**
 * Checks if coordinates are within Nepal's geographical boundaries
 * 
 * @function isWithinNepal
 * @param {string|number} lat - Latitude coordinate
 * @param {string|number} lon - Longitude coordinate
 * @returns {boolean} True if coordinates are within Nepal, false otherwise
 */
const isWithinNepal = (lat, lon) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) return false;

  return (
    latitude >= 26.347 &&
    latitude <= 30.447 &&
    longitude >= 80.058 &&
    longitude <= 88.201
  );
};

/**
 * Validates that both pickup and dropoff locations are within Nepal
 * 
 * @function validateNepalCoordinates
 * @param {Object} pickupInfo - Pickup location information
 * @param {number|string} pickupInfo.latitude - Pickup latitude
 * @param {number|string} pickupInfo.longitude - Pickup longitude
 * @param {Object} dropoffInfo - Dropoff location information
 * @param {number|string} dropoffInfo.latitude - Dropoff latitude
 * @param {number|string} dropoffInfo.longitude - Dropoff longitude
 * @throws {Error} If either pickup or dropoff coordinates are outside Nepal
 */
const validateNepalCoordinates = (pickupInfo, dropoffInfo) => {
  const pickupValid = isWithinNepal(pickupInfo.latitude, pickupInfo.longitude);
  const dropoffValid = isWithinNepal(dropoffInfo.latitude, dropoffInfo.longitude);

  if (!pickupValid || !dropoffValid) {
    throw new Error("Pickup or Dropoff coordinates must be within Nepal.");
  }
};

/**
 * Creates a new job entry
 * 
 * @async
 * @function createJob
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Object} req.body.driverInfo - Driver information
 * @param {string} req.body.driverInfo.id - Driver's ID
 * @param {Object} req.body.pickupInfo - Pickup location information
 * @param {Object} req.body.dropoffInfo - Dropoff location information
 * @param {Object} req.body.currentCoords - Current coordinates
 * @param {string} req.body.status - Job status
 * @param {string} req.body.note - Notes about the job
 * @param {Object} req.body.addOns - Additional job options
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created job or error message
 * @throws {Error} If server error occurs during job creation
 */
exports.createJob = async (req, res) => {
  try {
    const {
      driverInfo,
      pickupInfo,
      dropoffInfo,
      currentCoords,
      status,
      note,
      addOns,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(driverInfo.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    const driver = await User.findById(driverInfo.id);
    if (!driver || driver.role != 'driver') {
      return res.status(400).json({
        success: false,
        message: "Invalid or Non-driver User",
      })
    }

    validateNepalCoordinates(pickupInfo, dropoffInfo);

    const newJob = new Job({
      driverInfo,
      pickupInfo,
      dropoffInfo,
      currentCoords,
      status,
      note,
      addOns,
    });

    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (err) {
    console.error('Error creating job:', err.message);
    res.status(500).json({ message: 'Failed to create job', error: err.message });
  }
};

/**
 * Retrieves jobs with optional filtering by status and search terms
 * 
 * @async
 * @function getJobs
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.status] - Filter jobs by status
 * @param {string} [req.query.search] - Search term to filter jobs
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with matching jobs or error message
 * @throws {Error} If server error occurs during retrieval
 */
exports.getJobs = async (req, res) => {
  const { status, search } = req.query;

  try {
    const query = {};


    if (status) {
      query.status = status;
    }

    if (search) {
      const regex = new RegExp(search, 'i');

      query.$or = [
        { 'pickupInfo.name': regex },
        { 'dropoffInfo.name': regex },
        { 'pickupInfo.email': regex },
        { 'dropoffInfo.phone': regex },
        { 'driverInfo.name': regex },
        { 'driverInfo.phone': regex }

      ];
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 }).lean();

    res.status(200).json(jobs);

  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ message: 'Failed to fetch jobs', error: err.message });
  }
};

/**
 * Retrieves all jobs for a specific driver
 * 
 * @async
 * @function getJobsForDriver
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Contains the driver ID
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with driver's jobs or error message
 * @throws {Error} If server error occurs during retrieval
 */
exports.getJobsForDriver = async (req, res) => {
  const { driverId } = req.params.id;

  if (!driverId) {
    return res.status(400).json({
      success: false,
      message: "driverId parameter is required"
    });
  }

  try {
    const jobs = await Job.find({ 'driverInfo.id': driverId }).sort({ createdAt: -1 }).lean();
    res.status(200).json(jobs);
  } catch (err) {
    console.error('Error fetching jobs for driver:', err);
    res.status(500).json({ message: 'Failed to fetch jobs', error: err.message });
  }
};

/**
 * Retrieves a specific job by ID
 * 
 * @async
 * @function getJobById
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.jobId - ID of the job to retrieve
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with job data or error message
 * @throws {Error} If server error occurs during retrieval
 */
exports.getJobById = async (req, res) => {
  const jobId = req.params.jobId;
  try {
    const job = await Job.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job Not Found',
      });
    }
    return res.status(200).json({
      success: true,
      job
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * Updates the status of a specific job
 * 
 * @async
 * @function updateStatus
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.jobId - ID of the job to update
 * @param {Object} req.body - Request body
 * @param {string} req.body.status - New status for the job (pending, in-transit, delayed, delivered, or cancelled)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated job or error message
 * @throws {Error} If server error occurs during update
 */
exports.updateStatus = async (req, res) => {
  const jobId = req.params.jobId;
  const { status } = req.body;
  try {

    if (!status || !["pending", "in-transit", "delayed", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing status"
      });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { status },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message: "Job Not Found"
      });
    }
    return res.status(200).json({
      message: "job Updated Successfully",
      job: updatedJob
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal Server error"
    })
  }
}

/**
 * Generates a PDF report for a specific job
 * 
 * @async
 * @function generateJobPDF
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - ID of the job to generate PDF for
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with PDF file path or error message
 * @throws {Error} If server error occurs during PDF generation
 */
exports.generateJobPDF = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const pdfDir = path.join(__dirname, '../pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }

    const filePath = path.join(pdfDir, `job-${jobId}.pdf`);
    const doc = new PDFDocument();

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text('Job Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Driver Info:`);
    doc.text(`  Name: ${job.driverInfo.name}`);
    doc.text(`  Phone: ${job.driverInfo.phone}`);
    doc.moveDown();

    doc.text(`Pickup Info:`);
    doc.text(`  Name: ${job.pickupInfo.name}`);
    doc.text(`  Phone: ${job.pickupInfo.phone}`);
    doc.text(`  Email: ${job.pickupInfo.email || 'N/A'}`);
    doc.text(`  Latitude: ${job.pickupInfo.latitude}`);
    doc.text(`  Longitude: ${job.pickupInfo.longitude}`);
    doc.moveDown();

    doc.text(`Dropoff Info:`);
    doc.text(`  Name: ${job.dropoffInfo.name}`);
    doc.text(`  Phone: ${job.dropoffInfo.phone}`);
    doc.text(`  Email: ${job.dropoffInfo.email || 'N/A'}`);
    doc.text(`  Latitude: ${job.dropoffInfo.latitude}`);
    doc.text(`  Longitude: ${job.dropoffInfo.longitude}`);
    doc.moveDown();

    doc.text(`Status: ${job.status}`);
    doc.text(`Note: ${job.note || 'None'}`);
    doc.text(`Fragile Items: ${job.addOns?.fragileItems ? 'Yes' : 'No'}`);
    doc.text(`Heavy Item: ${job.addOns?.heavyItem ? 'Yes' : 'No'}`);
    doc.text(`Is Urgent: ${job.isUrgent ? 'Yes' : 'No'}`);
    doc.text(`Created At: ${job.createdAt}`);
    doc.text(`Updated At: ${job.updatedAt}`);

    doc.end();

    return res.status(200).json({
      message: 'PDF generated successfully',
      filePath: `/pdfs/job-${jobId}.pdf`
    });

  } catch (error) {
    console.error('Error generating job PDF:', error);
    res.status(500).json({ message: 'Server error' });
  }
};






