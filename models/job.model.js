const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ['pending', 'in-transit', 'delayed', 'delivered'],
        default: 'pending',
        required: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100, required: true },
    distanceRemaining: { type: Number, min: 0, required: true },
    pickupLocation: { type: String, required: true },
    deliveryLocation: { type: String, required: true },
    currentLocation: { type: String, required: true },
    pickupTime: { type: String, required: true },
    eta: { type: String, required: true },
    lastUpdate: { type: Date, required: true, default: Date.now },
    pickupCoords: {
        type: [Number],
        required: true,
        validate: {
            validator: function ([lat, lng]) {
                return lat >= 26 && lat <= 30 && lng >= 80 && lng <= 88;
            },
            message: 'Pickup coordinates must be within Nepal (lat: 26-30, lng: 80-88)',
        },
    },
    deliveryCoords: {
        type: [Number],
        required: true,
        validate: {
            validator: function ([lat, lng]) {
                return lat >= 26 && lat <= 30 && lng >= 80 && lng <= 88;
            },
            message: 'Delivery coordinates must be within Nepal (lat: 26-30, lng: 80-88)',
        },
    },
    currentCoords: {
        type: [Number],
        required: true,
        validate: {
            validator: function ([lat, lng]) {
                return lat >= 26 && lat <= 30 && lng >= 80 && lng <= 88;
            },
            message: 'Current coordinates must be within Nepal (lat: 26-30, lng: 80-88)',
        },
    },
    driverInfo: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        rating: { type: Number, required: true, min: 0, max: 5 },
        vehicle: { type: String, required: true },
        avatar: { type: String },
        isOnline: { type: Boolean, required: true, default: true },
    },
    customerInfo: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        company: { type: String, required: true },
    },
    liveUpdates: [
        {
            id: { type: Number, required: true },
            timestamp: { type: Date, required: true },
            icon: { type: String, required: true },
            message: { type: String, required: true },
        },
    ],
    customer: {
        name: { type: String },
        email: { type: String },
        phone: { type: String },
        company: { type: String },
    },
    pickup: {
        address: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
        contactPerson: { type: String },
        contactPhone: { type: String },
        instructions: { type: String },
    },
    delivery: {
        address: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
        contactPerson: { type: String },
        contactPhone: { type: String },
        instructions: { type: String },
    },
    jobDetails: {
        type: { type: String },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        scheduledDate: { type: Date },
        scheduledTime: { type: String },
        estimatedDuration: { type: Number },
        specialInstructions: { type: String },
        requiresSignature: { type: Boolean },
        fragileItems: { type: Boolean },
        heavyItems: { type: Boolean },
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
    etaStatus: { type: String, enum: ['on-time', 'delayed', 'early'], default: 'on-time' },
    isUrgent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);