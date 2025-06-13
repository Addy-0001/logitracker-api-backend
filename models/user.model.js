const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
    },
    company: {
        type: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
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

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
