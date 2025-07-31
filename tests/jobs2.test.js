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

describe('Logitracker Backend API Extended Tests', () => {
    describe('POST /api/v1/auth/signup', () => {
        it('should reject signup with invalid data', async () => {
            const response = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    firstName: '',
                    lastName: 'Doe',
                    email: 'invalid-email',
                    phone: '123',
                    password: 'short',
                    confirmPassword: 'short',
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ msg: 'Name is required' }),
                    expect.objectContaining({ msg: 'Valid email is required' }),
                    expect.objectContaining({ msg: 'Valid phone number is required' }),
                    expect.objectContaining({ msg: 'Password must be at least 8 characters long' }),
                ])
            );

            const user = await User.findOne({ email: 'invalid-email' });
            expect(user).toBeNull();
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

        it('should login driver with valid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/driver-login')
                .send({
                    email: 'driver@example.com',
                    password: 'Driver123!@#',
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: 'Logged in successfully',
                token: expect.any(String),
                user: expect.objectContaining({
                    email: 'driver@example.com',
                    role: 'driver',
                }),
            });

            const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'test-secret');
            expect(decoded.role).toBe('driver');
        });
    });

    describe('GET /api/v1/job/getJobById/:jobId', () => {
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

        it('should fetch job by ID with valid jobId', async () => {
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
                .get(`/api/v1/job/getJobById/${job._id}`)
                .set('Authorization', `Bearer ${driverToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                job: expect.objectContaining({
                    _id: job._id.toString(),
                    status: 'pending',
                    driverInfo: expect.objectContaining({
                        id: driver._id.toString(),
                    }),
                }),
            });
        });
    });

    describe('PATCH /api/v1/user/updateProfile', () => {
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

        it('should update authenticated user profile', async () => {
            const response = await request(app)
                .patch('/api/v1/user/updateProfile')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({
                    firstName: 'Updated',
                    lastName: 'Driver',
                    phone: '+9779876543211',
                });

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                user: expect.objectContaining({
                    firstName: 'Updated',
                    lastName: 'Driver',
                    phone: '+9779876543211',
                    email: 'driver@example.com',
                    role: 'driver',
                }),
            });

            const user = await User.findOne({ email: 'driver@example.com' });
            expect(user.firstName).toBe('Updated');
            expect(user.lastName).toBe('Driver');
            expect(user.phone).toBe('+9779876543211');
        });
    });

    describe('GET /api/v1/user/getUsers?role=driver', () => {
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

        it('should fetch users with role driver using admin JWT', async () => {
            const response = await request(app)
                .get('/api/v1/user/getUsers?role=driver')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                users: expect.arrayContaining([
                    expect.objectContaining({
                        email: 'driver@example.com',
                        role: 'driver',
                        firstName: 'Driver',
                        lastName: 'User',
                        phone: '+9779876543210',
                    }),
                ]),
                stats: expect.any(Object),
            });

            expect(response.body.users).toHaveLength(1);
            expect(response.body.users[0].firstName).toBe('Driver');
        });
    });
});