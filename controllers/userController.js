const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');

// Configure Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/avatars';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\//)) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
});

// Get user profile
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('Fetched user:', user); // For debugging
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const updates = req.body;
        const allowedUpdates = [
            'firstName', 'lastName', 'phone', 'position', 'company',
            'industry', 'size', 'website', 'address', 'preferences',
        ];
        const isValidUpdate = Object.keys(updates).every((key) => allowedUpdates.includes(key));
        if (!isValidUpdate) {
            return res.status(400).json({ message: 'Invalid updates' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true },
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

// Upload avatar
exports.uploadAvatar = [
    upload.single('avatar'),
    async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;
            const user = await User.findByIdAndUpdate(
                req.user._id,
                { avatar: avatarUrl },
                { new: true },
            ).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json({ avatar: avatarUrl });
        } catch (error) {
            next(error);
        }
    },
];

// Change password
exports.changePassword = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword; // Will be hashed by pre-save hook
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};

// Get all users with filters
exports.getUsers = async (req, res, next) => {
    try {
        const { role, search } = req.query;
        const query = {};

        if (role) query.role = role;
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        const users = await User.find(query).select('-password');
        const stats = {
            total: await User.countDocuments(),
            drivers: await User.countDocuments({ role: 'driver' }),
            dispatchers: 0, // Mocked as no dispatcher role
            active: await User.countDocuments(), // No status field, assume all active
        };

        res.status(200).json({ users, stats });
    } catch (error) {
        next(error);
    }
};

// Bulk delete users
exports.bulkDeleteUsers = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userIds } = req.body;

    try {
        const result = await User.deleteMany({ _id: { $in: userIds } });
        res.status(200).json({ message: `Deleted ${result.deletedCount} users` });
    } catch (error) {
        next(error);
    }
};

// Export users as CSV
exports.exportUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        const fields = [
            '_id', 'firstName', 'lastName', 'email', 'phone', 'role',
            'company', 'position', 'industry', 'size', 'website', 'address',
        ];
        const json2csv = new Parser({ fields });
        const csv = json2csv.parse(users);

        res.header('Content-Type', 'text/csv');
        res.attachment('users.csv');
        res.send(csv);
    } catch (error) {
        next(error);
    }
};