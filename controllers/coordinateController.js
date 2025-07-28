const Job = require("../models/job.model");

/**
 * Updates the current live coordinates for a specific job
 * 
 * @async
 * @function updateLiveCoordinate
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.jobId - ID of the job to update
 * @param {Object} req.body - Request body
 * @param {Object} req.body.currentCoords - Current coordinates object
 * @param {number} req.body.currentCoords.latitude - Current latitude
 * @param {number} req.body.currentCoords.longitude - Current longitude
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated job or error message
 * @throws {Error} If server error occurs during update
 */
exports.updateLiveCoordinate = async (req, res) => {
    const jobId = req.params.jobId;
    const { currentCoords } = req.body;

    try {
        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            { currentCoords },
            { new: true }
        );

        if (!updatedJob) {
            return res.status(404).json({
                success: false,
                message: "Job not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Job updated successfully",
            job: updatedJob
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

/**
 * Retrieves the current live coordinates for a specific job
 * 
 * @async
 * @function getLiveCoordinate
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.jobId - ID of the job to retrieve coordinates for
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with current coordinates or error message
 * @throws {Error} If server error occurs during retrieval
 */
exports.getLiveCoordinate = async (req,res) => {
    const jobId = req.params.jobId;
    try{
        const job = await Job.findById(jobId).lean();
        if(!job){
            return res.status(404).json({
                success:false,
                message:"Job Not found",
            });
        }
        res.status(200).json({
            success:true,
            coordinate:job.currentCoords,
        })
    }catch(error){
        console.error(error);
        res.status(500).json({
            success:false,
            message:"internal server error",
        });
    }
}

/**
 * Retrieves the pickup and dropoff coordinates for a specific job
 * 
 * @async
 * @function getCoordinates
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.jobId - ID of the job to retrieve coordinates for
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with pickup and dropoff coordinates or error message
 * @throws {Error} If server error occurs during retrieval
 */
exports.getCoordinates = async (req, res) => {
    const jobId = req.params.jobId;

    try {
        const job = await Job.findById(jobId).lean();

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Coordinates fetched successfully",
            pickupCoordinates: {
                latitude: job.pickupInfo.latitude,
                longitude: job.pickupInfo.longitude
            },
            dropoffCoordinates: {
                latitude: job.dropoffInfo.latitude,
                longitude: job.dropoffInfo.longitude
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

/**
 * Retrieves all coordinate information (pickup, dropoff, current) for a specific job
 * 
 * @async
 * @function getAllCoordinates
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.jobId - ID of the job to retrieve coordinates for
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with all coordinate data or error message
 * @throws {Error} If server error occurs during retrieval
 */
exports.getAllCoordinates = async (req, res) => {
    const jobId = req.params.jobId;

    try {
        const job = await Job.findById(jobId, {
            pickupInfo: 1,
            dropoffInfo: 1,
            currentCoords: 1,
            _id: 1
        }).lean();

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Job coordinates fetched successfully",
            data: {
                jobId: job._id,
                pickupInfo: job.pickupInfo,
                dropoffInfo: job.dropoffInfo,
                currentCoords: job.currentCoords
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};



