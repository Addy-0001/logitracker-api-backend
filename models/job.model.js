const mongoose = require('mongoose');

// Clear cached model to prevent using outdated schema
delete mongoose.models.Job;
delete mongoose.modelSchemas.Job;

const JobSchema = new mongoose.Schema({
    customer: {
        name: String,
        email: String,
        phone: String,
        company: String
    },
    pickup: {
        address: String,
        city: String,
        state: String,
        zipCode: String,
        contactPerson: String,
        contactPhone: String,
        instructions: String
    },
    delivery: {
        address: String,
        city: String,
        state: String,
        zipCode: String,
        contactPerson: String,
        contactPhone: String,
        instructions: String
    },
    jobDetails: {
        type: String,
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        scheduledDate: Date,
        scheduledTime: String,
        estimatedDuration: Number,
        specialInstructions: String,
        requiresSignature: Boolean,
        fragileItems: Boolean,
        heavyItems: Boolean
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: String,
    status: { type: String, enum: ['pending', 'in-transit', 'delayed', 'delivered'], default: 'pending' },
    progress: { type: Number, default: 0 },
    eta: String,
    etaStatus: { type: String, enum: ['on-time', 'delayed', 'early'], default: 'on-time' },
    isUrgent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Log schema instance for debugging
console.log('JobSchema jobDetails type:', JobSchema.paths.jobDetails.instance);

module.exports = mongoose.model('Job', JobSchema);