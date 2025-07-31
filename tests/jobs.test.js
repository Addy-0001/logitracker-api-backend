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

describe('Logitracker Backend API Tests', () => {
    describe('POST /api/v1/auth/signup', () => {
        it('should register driver with valid data', async () => {
            const response = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    phone: '+9779812345678',
                    password: 'Test123!@#',
                    confirmPassword: 'Test123!@#',
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: 'Your Account is registered successfully',
            });

            const user = await User.findOne({ email: 'john@example.com' });
            expect(user).toBeTruthy();
            expect(user.role).toBe('driver');
            expect(await bcrypt.compare('Test123!@#', user.password)).toBe(true);
        });
    });

    describe('POST /api/v1/auth/driver-login', () => {
        beforeEach(async () => {
            // Create driver user for login test
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

        it('should reject driver login with invalid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/driver-login')
                .send({
                    email: 'driver@example.com',
                    password: 'WrongPass',
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                message: 'Invalid Credentials',
            });
        });
    });

    describe('POST /api/v1/job/createJob', () => {
        let adminToken;
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

            // Generate admin JWT
            adminToken = jwt.sign(
                { id: admin._id, role: 'admin' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );
        });

        it('should create job with valid data and admin JWT', async () => {
            const driver = await User.findOne({ email: 'driver@example.com' });
            const jobData = {
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
            };

            const response = await request(app)
                .post('/api/v1/job/createJob')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(jobData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.driverInfo.id).toBe(jobData.driverInfo.id);
            expect(response.body.status).toBe('pending');

            const job = await Job.findById(response.body._id);
            expect(job).toBeTruthy();
            expect(job.pickupInfo.latitude).toBe('27.7');
        });
    });

    describe('PATCH /api/v1/coordinate/updateCoord/:jobId', () => {
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

        it('should update live coordinates with valid jobId', async () => {
            const driver = await User.findOne({ email: 'driver@example.com' });
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

            const response = await request(app)
                .patch(`/api/v1/coordinate/updateCoord/${job._id}`)
                .set('Authorization', `Bearer ${driverToken}`)
                .send({
                    currentCoords: {
                        latitude: '27.75',
                        longitude: '85.35',
                    },
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: 'Job updated successfully',
                job: expect.objectContaining({
                    _id: job._id.toString(),
                    currentCoords: {
                        latitude: '27.75',
                        longitude: '85.35',
                    },
                }),
            });

            const updatedJob = await Job.findById(job._id);
            expect(updatedJob.currentCoords.latitude).toBe('27.75');
        });
    });

    describe('PATCH /api/v1/user/uploadAvatar', () => {
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

        it('should upload user avatar with valid image', async () => {
            uploadToCloudinary.mockResolvedValue({
                secure_url: 'http://cloudinary.com/image.jpg',
                public_id: 'image123',
            });

            const response = await request(app)
                .patch('/api/v1/user/uploadAvatar')
                .set('Authorization', `Bearer ${driverToken}`)
                .attach('avatar', Buffer.from('fake-image-data'), {
                    filename: 'avatar.jpg',
                    contentType: 'image/jpeg',
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                message: 'Updated profile picture successfully',
                image: 'http://cloudinary.com/image.jpg',
            });

            const user = await User.findOne({ email: 'driver@example.com' });
            expect(user.profileImage).toBe('http://cloudinary.com/image.jpg');
            expect(user.profileImageId).toBe('image123');
        });
    });
});