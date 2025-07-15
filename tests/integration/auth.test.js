// tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../server');
const User = require('../../models/user.model');
const jwt = require('jsonwebtoken');

describe('Auth API', () => {
    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('POST /api/v1/auth/signup', () => {
        it('should register a new user with valid data', async () => {
            const userData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                company: 'Acme Inc',
                password: 'password123',
                role: 'driver',
            };

            const response = await request(app)
                .post('/api/v1/auth/signup')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('User registered successfully');
            expect(response.body.token).toBeDefined();
            expect(response.body.user).toMatchObject({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                company: 'Acme Inc',
                role: 'driver',
            });

            const user = await User.findOne({ email: 'john@example.com' });
            expect(user).toBeDefined();
        });

        it('should return 400 for invalid email', async () => {
            const userData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'invalid-email',
                company: 'Acme Inc',
                password: 'password123',
            };

            const response = await request(app)
                .post('/api/v1/auth/signup')
                .send(userData);

            expect(response.status).toBe(400);
            expect(response.body.errors).toContainEqual(
                expect.objectContaining({ msg: 'Please enter a valid email' })
            );
        });

        it('should return 400 if user already exists', async () => {
            await User.create({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                company: 'Acme Inc',
                password: 'password123',
                role: 'driver',
            });

            const userData = {
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'john@example.com',
                company: 'Acme Inc',
                password: 'password123',
                role: 'driver',
            };

            const response = await request(app)
                .post('/api/v1/auth/signup')
                .send(userData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('User already exists');
        });

        it('should return 400 for missing required fields', async () => {
            const userData = {
                firstName: 'John',
                // Missing lastName, email, password, etc.
            };

            const response = await request(app)
                .post('/api/v1/auth/signup')
                .send(userData);

            expect(response.status).toBe(400);
            expect(response.body.errors).toContainEqual(
                expect.objectContaining({ msg: 'Last name must be at least 2 characters' })
            );
        });
    });

    describe('POST /api/v1/auth/login', () => {
        beforeEach(async () => {
            const user = new User({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                company: 'Acme Inc',
                password: 'password123',
                role: 'driver',
            });
            await user.save();
        });

        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'john@example.com', password: 'password123' });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Login successful');
            expect(response.body.token).toBeDefined();
            expect(response.body.user).toMatchObject({
                email: 'john@example.com',
                role: 'driver',
            });
        });

        it('should return 400 for invalid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'john@example.com', password: 'wrongpassword' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid credentials');
        });

        it('should return 400 for missing password', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'john@example.com' });

            expect(response.status).toBe(400);
            expect(response.body.errors).toContainEqual(
                expect.objectContaining({ msg: 'Password is required' })
            );
        });
    });
});