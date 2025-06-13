const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const updates = req.body;
        const allowedUpdates = [
            'firstName', 'lastName', 'phone', 'position', 'company',
            'industry', 'size', 'website', 'address', 'preferences'
        ];
        const isValidUpdate = Object.keys(updates).every(key => allowedUpdates.includes(key));
        if (!isValidUpdate) return res.status(400).json({ message: 'Invalid updates' });

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Upload avatar (assumes multer for file handling)
const multer = require('multer');
const upload = multer({ dest: 'uploads/avatars/' }); // Adjust storage as needed
exports.uploadAvatar = [
    upload.single('avatar'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
            // Simulate storing file and returning URL
            const avatarUrl = `/avatars/${req.file.filename}`; // Replace with actual storage logic
            const user = await User.findByIdAndUpdate(
                req.userId,
                { avatar: avatarUrl },
                { new: true }
            ).select('-password');
            res.status(200).json({ avatar: avatarUrl });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
];

// Change password
exports.changePassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};