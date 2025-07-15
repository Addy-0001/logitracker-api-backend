const request = require('supertest');
const app = require('../../server');
const User = require('../../models/user.model');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

jest.mock('multer', () => {
    const multer = () => ({
        single: (field) => (req, res, next) => {
            if (req.body[field] === 'no-file') {
                req.file = null; // Simulate no file uploaded
                next();
            } else if (req.body[field] === 'invalid-file') {
                req.file = {
                    filename: 'test-file.txt',
                    path: './uploads/avatars/test-file.txt',
                    mimetype: 'text/plain',
                };
                next();
            } else {
                req.file = {
                    filename: 'test-avatar.jpg',
                    path: './uploads/avatars/test-avatar.jpg',
                    mimetype: 'image/jpeg',
                };
                next();
            }
        },
    });
    multer.diskStorage = jest.fn();
    return multer;
});

describe('Users API', () => {
    let token, userId, adminToken, adminId;

    beforeEach(async () => {
        await User.deleteMany({});

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
    });

    describe('GET /api/v1/users/me', () => {
        it('should return user profile with valid token', async () => {
            const response = await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                _id: userId.toString(),
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                company: 'Acme Inc',
                role: 'driver',
            });
            expect(response.body.password).toBeUndefined();
        });

        it('should return 401 for missing token', async () => {
            const response = await request(app).get('/api/v1/users/me');

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('No token provided');
        });

        it('should return 401 for invalid token', async () => {
            const response = await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid or expired token');
        });
    });

    describe('POST /api/v1/users/avatar', () => {
        it('should upload avatar with valid token', async () => {
            const response = await request(app)
                .post('/api/v1/users/avatar')
                .set('Authorization', `Bearer ${token}`)
                .attach('avatar', Buffer.from(''), { filename: 'test-avatar.jpg', contentType: 'image/jpeg' });

            expect(response.status).toBe(200);
            expect(response.body.avatar).toBe('/uploads/avatars/test-avatar.jpg');

            const user = await User.findById(userId);
            expect(user.avatar).toBe('/uploads/avatars/test-avatar.jpg');
        });

        it('should return 401 for missing token', async () => {
            const response = await request(app)
                .post('/api/v1/users/avatar')
                .attach('avatar', Buffer.from(''), { filename: 'test-avatar.jpg', contentType: 'image/jpeg' });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('No token provided');
        });

        it('should return 400 for no file uploaded', async () => {
            const response = await request(app)
                .post('/api/v1/users/avatar')
                .set('Authorization', `Bearer ${token}`)
                .send({ avatar: 'no-file' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('No file uploaded');
        });

        it('should return 400 for invalid file type', async () => {
            const response = await request(app)
                .post('/api/v1/users/avatar')
                .set('Authorization', `Bearer ${token}`)
                .send({ avatar: 'invalid-file' });

            expect(response.status).toBe(200);
        });
    });

    describe('PATCH /api/v1/users/update', () => {
        it('should update user profile with valid data', async () => {
            const updateData = {
                firstName: 'Jane',
                company: 'New Corp',
            };

            const response = await request(app)
                .patch('/api/v1/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                firstName: 'Jane',
                company: 'New Corp',
            });

            const user = await User.findById(userId);
            expect(user.firstName).toBe('Jane');
            expect(user.company).toBe('New Corp');
        });

        it('should return 400 for invalid updates', async () => {
            const updateData = { invalidField: 'value' };

            const response = await request(app)
                .patch('/api/v1/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send(updateData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid updates');
        });

        it('should return 401 for missing token', async () => {
            const response = await request(app)
                .patch('/api/v1/users/update')
                .send({ firstName: 'Jane' });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('No token provided');
        });
    });

    describe('PATCH /api/v1/users/auth/change-password', () => {
        it('should change password with valid credentials', async () => {
            const response = await request(app)
                .patch('/api/v1/users/auth/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'password123', newPassword: 'newpassword456' });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Password updated successfully');

            const user = await User.findById(userId);
            const isMatch = await user.comparePassword('newpassword456');
            expect(isMatch).toBe(true);
        });

        it('should return 400 for invalid current password', async () => {
            const response = await request(app)
                .patch('/api/v1/users/auth/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword456' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Current password is incorrect');
        });

        it('should return 401 for missing token', async () => {
            const response = await request(app)
                .patch('/api/v1/users/auth/change-password')
                .send({ currentPassword: 'password123', newPassword: 'newpassword456' });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('No token provided');
        });
    });
});