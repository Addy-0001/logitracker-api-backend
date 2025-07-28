const User = require('../models/user.model');
const bcrypt = require("bcryptjs");
const { Parser } = require('json2csv');
const { uploadToCloudinary } = require('../config/cloudinaryConfig');

/**
 * Retrieves the profile information for the authenticated user
 * 
 * @async
 * @function getProfile
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information from auth middleware
 * @param {string} req.user._id - ID of the authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with user profile data or error message
 * @throws {Error} If server error occurs during retrieval
 */
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            success: true,
            message: "Profile Fetched",
            user: user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "internal Server Error"
        })
    }
};

/**
 * Updates the profile information for the authenticated user
 * 
 * @async
 * @function updateProfile
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information from auth middleware
 * @param {string} req.user._id - ID of the authenticated user
 * @param {Object} req.body - Request body with fields to update
 * @param {string} [req.body.firstName] - User's first name
 * @param {string} [req.body.lastName] - User's last name
 * @param {string} [req.body.email] - User's email address
 * @param {string} [req.body.phone] - User's phone number
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with updated user data or error message
 * @throws {Error} If server error occurs during update
 */
exports.updateProfile = async (req, res) => {
    const userId = req.user.id;
    try {
        const updates = req.body;
        const allowedUpdates = [
            'firstName', 'lastName', 'email', 'phone'
        ];
        const isValidUpdate = Object.keys(updates).every((key) => allowedUpdates.includes(key));
        if (!isValidUpdate) {
            return res.status(400).json({ message: 'Invalid updates' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true },
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

/**
 * Updates another user's profile information (admin function)
 * 
 * @async
 * @function updateUserProfile
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.id - ID of the user to update
 * @param {Object} req.body - Request body with fields to update
 * @param {string} [req.body.firstName] - User's first name
 * @param {string} [req.body.lastName] - User's last name
 * @param {string} [req.body.phone] - User's phone number
 * @param {string} [req.body.role] - User's role (admin/driver)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated user data or error message
 * @throws {Error} If server error occurs during update
 */
exports.updateUserProfile = async (req, res) => {
    const userId = req.params.id;
    try {
        const updates = req.body;
        // const allowedUpdates = [
        //     'firstName', 'lastName', 'phone', 'role', '_id', 'createdAt', 'updatedAt', 'profileImage', 'profileImageId'
        // ];
        // // const isValidUpdate = Object.keys(updates).every((key) => allowedUpdates.includes(key));
        // // console.log(isValidUpdate);
        // console.log(updates)
        // // if (!isValidUpdate) {
        // //     return res.status(400).json({
        // //         success: false,
        // //         message: 'Invalid updates'
        // //     });
        // // }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true },
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

/**
 * Uploads and updates the user's profile avatar
 * 
 * @async
 * @function uploadAvatar
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information from auth middleware
 * @param {string} req.user._id - ID of the authenticated user
 * @param {Object} req.file - Uploaded file information from multer middleware
 * @param {string} req.file.filename - Name of the uploaded file
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with profile image path or error message
 * @throws {Error} If server error occurs during upload
 */
exports.uploadAvatar = async (req, res) => {
    const userId = req.user.id;

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadToCloudinary(req.file.buffer);
        const user = await User.findByIdAndUpdate(
            userId,
            {
                profileImage: result.secure_url,
                profileImageId: result.public_id
            },
            { new: true },
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: "Updated profile picture successfully", image: result.secure_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

/**
 * Changes the password for the authenticated user
 * 
 * @async
 * @function changePassword
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information from auth middleware
 * @param {string} req.user._id - ID of the authenticated user
 * @param {Object} req.body - Request body
 * @param {string} req.body.currentPassword - User's current password
 * @param {string} req.body.newPassword - User's new password
 * @param {string} req.body.confirmNewPassword - Confirmation of the new password
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 * @throws {Error} If server error occurs during password change
 */
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ message: "New passwords do not match" });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password should be at least 6 characters long" });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
};

/**
 * Retrieves users with optional filtering by role and search term
 * 
 * @async
 * @function getUsers
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.role] - Filter users by role (admin/driver)
 * @param {string} [req.query.search] - Search term to filter users
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with users and stats or error message
 * @throws {Error} If server error occurs during retrieval
 */
exports.getUsers = async (req, res) => {
    const { role, search } = req.query;

    try {
        const query = {};


        if (role) {
            query.role = role;
        }

        if (search) {
            const regex = new RegExp(search, 'i');

            query.$or = [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
                { phone: regex }
            ];
        }

        const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean();

        const stats = {
            total: await User.countDocuments(),
            drivers: await User.countDocuments({ role: 'driver' }),
            admins: await User.countDocuments({ role: 'admin' })
        };

        res.status(200).json({ users, stats });

    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

/**
 * Exports all driver user data to a CSV file
 * 
 * @async
 * @function exportDrivers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object|Buffer} CSV file download or JSON error message
 * @throws {Error} If server error occurs during export
 */
exports.exportDrivers = async (req, res) => {
    try {
        const drivers = await User.find({ role: 'driver' }).select('-password -__v');

        if (drivers.length === 0) {
            return res.status(404).json({ message: "No driver users found." });
        }

        const fields = ['_id', 'firstName', 'lastName', 'email', 'phone', 'profileImage', 'role', 'createdAt', 'updatedAt'];
        const json2csv = new Parser({ fields });
        const csv = json2csv.parse(drivers);

        res.header('Content-Type', 'text/csv');
        res.attachment('drivers.csv');
        return res.send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error while exporting drivers' });
    }
};
