const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters'],
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
    },
    company: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
        match: [/^\+?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/, 'Invalid phone number'],
    },
    position: {
        type: String,
        trim: true,
    },
    avatar: {
        type: String,
        trim: true,
    },
    industry: {
        type: String,
        enum: ['logistics', 'manufacturing', 'retail', 'healthcare', 'food', 'other'],
    },
    size: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501+'],
    },
    website: {
        type: String,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    preferences: {
        emailShipmentUpdates: { type: Boolean, default: true },
        emailWeeklyReports: { type: Boolean, default: true },
        emailNewFeatures: { type: Boolean, default: true },
        emailMarketing: { type: Boolean, default: false },
        showRecentShipments: { type: Boolean, default: true },
        showAnalytics: { type: Boolean, default: true },
        enableNotifications: { type: Boolean, default: false },
        language: { type: String, default: 'en' },
        timezone: { type: String, default: 'UTC-5' },
    },
    role: {
        type: String,
        enum: ['admin', 'driver'],
        default: 'driver',
    },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);