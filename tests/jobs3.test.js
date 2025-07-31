const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');
const User = require('../models/user.model');
const Job = require('../models/job.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { uploadToCloudinary } = require('../config/cloudinaryConfig');

// Mock connectDB to prevent actual MongoDB connection
jest.mock('../config/db', () => jest.fn());

// Mock Cloudinary upload
jest.mock('../config/cloudinaryConfig');

let mongoServer;
let server;

jest.setTimeout(30000); // Increase timeout for MongoDB setup

beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to in-memory MongoDB
    await mongoose.connect(mongoUri);

    // Start the Express server on a random port
    server = app.listen(0);
});

afterAll(async () => {
    // Close the Express server
    if (server) {
        await new Promise(resolve => server.close(resolve));
    }

    // Disconnect Mongoose and stop MongoDB server
    await mongoose.connection.close();
    await mongoServer.stop();
});

afterEach(async () => {
    // Clear mocks and database collections
    jest.clearAllMocks();
    await User.deleteMany({});
    await Job.deleteMany({});
});

describe('Logitracker Backend API Additional Tests', () => {
    describe('PATCH /api/v1/job/:jobId/status', () => {
        let adminToken;
        let jobId;
        beforeEach(async () => {
            // Create admin and driver users
            const admin = new User({
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                phone: '+9779812345679',
                password: await bcrypt.hash('Admin123!@#', 12),
                role: 'admin',
            });
            await admin.save();

            const driver = new User({
                firstName: 'Driver',
                lastName: 'User',
                email: 'driver@example.com',
                phone: '+9779876543210',
                password: await bcrypt.hash('Driver123!@#', 12),
                role: 'driver',
            });
            await driver.save();

            // Create a job
            const job = new Job({
                driverInfo: {
                    id: driver._id.toString(),
                    name: 'Driver User',
                    phone: '+9779876543210',
                },
                pickupInfo: {
                    name: 'Pickup',
                    phone: '+9779876543210',
                    latitude: '27.7',
                    longitude: '85.3',
                },
                dropoffInfo: {
                    name: 'Dropoff',
                    phone: '+9779876543210',
                    latitude: '27.8',
                    longitude: '85.4',
                },
                status: 'pending',
            });
            await job.save();
            jobId = job._id;

            // Generate admin JWT
            adminToken = jwt.sign(
                { id: admin._id, role: 'admin' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );
        });

        it('should update job status with valid admin JWT', async () => {
            const response = await request(app)
                .patch(`/api/v1/job/${jobId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'cancelled' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                message: 'job Updated Successfully',
                job: expect.objectContaining({
                    _id: jobId.toString(),
                    status: 'cancelled',
                }),
            });

            const updatedJob = await Job.findById(jobId);
            expect(updatedJob.status).toBe('cancelled');
        });
    });

    describe('GET /api/v1/coordinate/getAllCoord/:jobId', () => {
        it('should return 404 for non-existent job ID', async () => {
            const fakeJobId = '123456789012345678901234';
            const response = await request(app)
                .get(`/api/v1/coordinate/getAllCoord/${fakeJobId}`);

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                message: 'Job not found',
            });
        });
    });

    describe('PATCH /api/v1/user/changePassword', () => {
        let driverToken;
        beforeEach(async () => {
            // Create driver user
            const driver = new User({
                firstName: 'Driver',
                lastName: 'User',
                email: 'driver@example.com',
                phone: '+9779876543210',
                password: await bcrypt.hash('Driver123!@#', 12),
                role: 'driver',
            });
            await driver.save();

            // Generate driver JWT
            driverToken = jwt.sign(
                { id: driver._id, role: 'driver' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );
        });

        it('should reject password change with invalid old password', async () => {
            const response = await request(app)
                .patch('/api/v1/user/changePassword')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({
                    oldPassword: 'WrongPass123!@#',
                    newPassword: 'NewPass123!@#',
                    confirmNewPassword: 'NewPass123!@#',
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                message: 'Invalid old password',
            });

            const user = await User.findOne({ email: 'driver@example.com' });
            expect(await bcrypt.compare('Driver123!@#', user.password)).toBe(true); // Password unchanged
        });
    });

    describe('GET /api/v1/user/getUsers', () => {
        beforeEach(async () => {
            // Create admin and driver users
            const admin = new User({
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                phone: '+9779812345679',
                password: await bcrypt.hash('Admin123!@#', 12),
                role: 'admin',
            });
            await admin.save();

            const driver = new User({
                firstName: 'Driver',
                lastName: 'User',
                email: 'driver@example.com',
                phone: '+9779876543210',
                password: await bcrypt.hash('Driver123!@#', 12),
                role: 'driver',
            });
            await driver.save();
        });

        it('should reject fetching users without authentication', async () => {
            const response = await request(app)
                .get('/api/v1/user/getUsers');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: 'No token provided',
            });
        });
    });

    describe('POST /api/v1/job/createJob', () => {
        let adminToken;
        beforeEach(async () => {
            // Create admin user
            const admin = new User({
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                phone: '+9779812345679',
                password: await bcrypt.hash('Admin123!@#', 12),
                role: 'admin',
            });
            await admin.save();

            // Generate admin JWT
            adminToken = jwt.sign(
                { id: admin._id, role: 'admin' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );
        });

        it('should reject job creation with invalid data', async () => {
            const jobData = {
                driverInfo: {
                    id: '123456789012345678901234', // Invalid ID
                    name: '',
                    phone: '123',
                },
                pickupInfo: {
                    name: '',
                    phone: '123',
                    latitude: 'invalid', // Invalid latitude
                    longitude: '85.3',
                },
                dropoffInfo: {
                    name: 'Dropoff',
                    phone: '+9779876543210',
                    latitude: '27.8',
                    longitude: '85.4',
                },
                status: 'invalid', // Invalid status
            };

            const response = await request(app)
                .post('/api/v1/job/createJob')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(jobData);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ msg: 'Invalid driver ID' }),
                    expect.objectContaining({ msg: 'Driver name is required' }),
                    expect.objectContaining({ msg: 'Valid phone number is required' }),
                    expect.objectContaining({ msg: 'Pickup name is required' }),
                    expect.objectContaining({ msg: 'Valid latitude is required' }),
                    expect.objectContaining({ msg: 'Invalid status' }),
                ])
            );

            const job = await Job.findOne({ status: 'invalid' });
            expect(job).toBeNull();
        });
    });
});