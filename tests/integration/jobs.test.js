const request = require('supertest');
const app = require('../../server');
const User = require('../../models/user.model');
const Job = require('../../models/job.model');
const jwt = require('jsonwebtoken');

describe('Jobs API', () => {
    let token, userId, adminToken, adminId, jobId;

    beforeEach(async () => {
        await User.deleteMany({});
        await Job.deleteMany({});

        const user = await User.create({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            company: 'Acme Inc',
            password: 'password123',
            role: 'driver',
        });

        const admin = await User.create({
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@example.com',
            company: 'Acme Inc',
            password: 'password123',
            role: 'admin',
        });

        userId = user._id;
        token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });

        adminId = admin._id;
        adminToken = jwt.sign({ id: adminId }, process.env.JWT_SECRET, { expiresIn: '1d' });

        const job = await Job.create({
            id: 'JOB-2025-001',
            status: 'pending',
            progress: 0,
            distanceRemaining: 100,
            pickupLocation: 'Thamel, Kathmandu',
            deliveryLocation: 'Lakeside, Pokhara',
            currentLocation: 'Thamel, Kathmandu',
            pickupTime: '9:00 AM',
            eta: '3:00 PM',
            pickupCoords: [27.7172, 85.3240],
            deliveryCoords: [28.2096, 83.9856],
            currentCoords: [27.7172, 85.3240],
            driverInfo: {
                name: 'John Doe',
                phone: '+977 984-123-4567',
                rating: 4.7,
                vehicle: 'Truck - NP-1234',
                isOnline: true,
            },
            customerInfo: {
                name: 'Test Customer',
                company: 'Test Corp',
                phone: '+977 985-987-6543',
                email: 'test@corp.com',
            },
            assignedTo: userId,
        });

        jobId = job._id.toString(); // Ensure jobId is a string
    });

    describe('POST /api/v1/jobs', () => {
        it('should create a job with valid data', async () => {
            const jobData = {
                id: 'JOB-2025-004',
                status: 'pending',
                progress: 0,
                distanceRemaining: 100,
                pickupLocation: 'Thamel, Kathmandu',
                deliveryLocation: 'Lakeside, Pokhara',
                currentLocation: 'Thamel, Kathmandu',
                pickupTime: '9:00 AM',
                eta: '3:00 PM',
                pickupCoords: [27.7172, 85.3240],
                deliveryCoords: [28.2096, 83.9856],
                currentCoords: [27.7172, 85.3240],
                driverInfo: {
                    name: 'John Doe',
                    phone: '+977 984-123-4567',
                    rating: 4.7,
                    vehicle: 'Truck - NP-1234',
                    isOnline: true,
                },
                customerInfo: {
                    name: 'Test Customer',
                    company: 'Test Corp',
                    phone: '+977 985-987-6543',
                    email: 'test@corp.com',
                },
                assignedTo: userId.toString(),
            };

            const response = await request(app)
                .post('/api/v1/jobs')
                .set('Authorization', `Bearer ${token}`)
                .send(jobData);

            expect(response.status).toBe(201);
            expect(response.body.id).toBe('JOB-2025-004');
            expect(response.body.assignedTo).toBe(userId.toString());
        });

        it('should return 401 for missing token', async () => {
            const response = await request(app)
                .post('/api/v1/jobs')
                .send({});

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('No token provided');
        });

        it('should return 400 for invalid coordinates', async () => {
            const jobData = {
                id: 'JOB-2025-005',
                status: 'pending',
                progress: 0,
                distanceRemaining: 100,
                pickupLocation: 'Thamel, Kathmandu',
                deliveryLocation: 'Lakeside, Pokhara',
                currentLocation: 'Thamel, Kathmandu',
                pickupTime: '9:00 AM',
                eta: '3:00 PM',
                pickupCoords: [200, 85.3240],
                deliveryCoords: [28.2096, 83.9856],
                currentCoords: [27.7172, 85.3240],
                driverInfo: {
                    name: 'John Doe',
                    phone: '+977 984-123-4567',
                    rating: 4.7,
                    vehicle: 'Truck - NP-1234',
                    isOnline: true,
                },
                customerInfo: {
                    name: 'Test Customer',
                    company: 'Test Corp',
                    phone: '+977 985-987-6543',
                    email: 'test@corp.com',
                },
                assignedTo: userId.toString(),
            };

            const response = await request(app)
                .post('/api/v1/jobs')
                .set('Authorization', `Bearer ${token}`)
                .send(jobData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('pickupCoords must be within Nepal (lat: 26-30, lng: 80-88)');
        });
    });

    describe('GET /api/v1/jobs/summary', () => {
        it('should return job summary for admin', async () => {
            const response = await request(app)
                .get('/api/v1/jobs/summary')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                pending: 1,
                urgent: 0,
            });
        });

        it('should return 200 for non-admin user', async () => {
            const response = await request(app)
                .get('/api/v1/jobs/summary')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                pending: 1,
                urgent: 0,
            });
        });
    });

    describe('GET /api/v1/jobs/:id', () => {
        it('should return job by ID for authorized user', async () => {
            const response = await request(app)
                .get(`/api/v1/jobs/${jobId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
        });

        it('should return 404 for non-existent job ID', async () => {
            const response = await request(app)
                .get('/api/v1/jobs/123456789012345678901234')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Job not found');
        });

        it('should return 401 for missing token', async () => {
            const response = await request(app).get(`/api/v1/jobs/${jobId}`);

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('No token provided');
        });
    });
});