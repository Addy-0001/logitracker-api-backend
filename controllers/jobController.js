const Job = require('../models/job.model');
const User = require('../models/user.model');
const mongoose = require('mongoose'); // FIXED: Added missing import
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Checks if coordinates are within Nepal's geographical boundaries
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
    if (!driver || driver.role !== 'driver') {
        return res.status(400).json({
            success: false,
            message: "Invalid or Non-driver User",
        });
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
 * FIXED: Parameter extraction bug
 */
exports.getJobsForDriver = async (req, res) => {
  const { driverId } = req.params; // FIXED: Was destructuring from req.params.id

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
            success: false, // FIXED: Was status: false
            message: "Internal Server error"
        });
    }
};

/**
 * Generates a PDF report for a specific job
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

/**
 * Retrieves a list of all job PDF reports
 */
exports.getAllJobPdfs = async (req, res) => {
    try {
        const pdfDir = path.join(__dirname, '../pdfs');

        if (!fs.existsSync(pdfDir)) {
            return res.status(404).json({ message: 'PDF directory not found' });
        }

        const files = fs.readdirSync(pdfDir);
        const jobPdfs = files.filter(file => file.startsWith('job-') && file.endsWith('.pdf'));
        const baseUrl = `${req.protocol}://${req.get('host')}/pdfs`;

        const fileLinks = jobPdfs.map(file => {
            const id = file.replace('job-', '').replace('.pdf', '');
            return {
                id,
                name: file,
                url: `${baseUrl}/${file}`
            };
        });

        return res.status(200).json({
            message: 'Job PDFs fetched successfully',
            count: jobPdfs.length,
            files: fileLinks
        });

    } catch (error) {
        console.error('Error fetching PDFs:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Downloads a PDF report for a specific job
 */
exports.downloadJobPdf = async (req, res) => {
    const fileId = req.params.jobId;
    const fileName = `job-${fileId}.pdf`;
    const filePath = path.join(__dirname, '../pdfs', fileName);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    res.download(filePath, fileName, (err) => {
        if (err) {
            console.error('Download error:', err);
            return res.status(500).json({ message: 'Error downloading file' });
        }
    });
};