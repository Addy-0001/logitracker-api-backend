const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');
const Job = require('../../models/job.model');
const User = require('../../models/user.model');

// Mock dependencies
jest.mock('../../models/job.model');
jest.mock('../../models/user.model');
jest.mock('../../config/db');

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.NODE_ENV = 'test';

describe('Coordinate Controller Integration with Middleware', () => {
  let adminToken, driverToken;
  let adminId, driverId, jobId;

  beforeAll(() => {
    // Mock admin user
    adminId = '507f1f77bcf86cd799439011';
    const adminPayload = {
      _id: adminId,
      email: 'admin@test.com',
      role: 'admin'
    };
    adminToken = jwt.sign(adminPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Mock driver user
    driverId = '507f1f77bcf86cd799439012';
    const driverPayload = {
      _id: driverId,
      email: 'driver@test.com',
      role: 'driver'
    };
    driverToken = jwt.sign(driverPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Mock job ID
    jobId = '507f1f77bcf86cd799439013';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/v1/coordinate/updateCoord/:jobId', () => {
    it('should update coordinates with valid driver token', async () => {
      const updatedJob = {
        _id: jobId,
        currentCoords: { latitude: '27.7172', longitude: '85.3240' },
        status: 'in-transit'
      };

      Job.findByIdAndUpdate.mockResolvedValue(updatedJob);

      const res = await request(app)
        .patch(`/api/v1/coordinate/updateCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          currentCoords: { latitude: '27.7172', longitude: '85.3240' }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Job updated successfully');
      expect(res.body.job).toEqual(updatedJob);
      expect(Job.findByIdAndUpdate).toHaveBeenCalledWith(
        jobId,
        { currentCoords: { latitude: '27.7172', longitude: '85.3240' } },
        { new: true }
      );
    });

    it('should return 401 without authorization header', async () => {
      const res = await request(app)
        .patch(`/api/v1/coordinate/updateCoord/${jobId}`)
        .send({
          currentCoords: { latitude: '27.7172', longitude: '85.3240' }
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("No token, authorization denied");
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .patch(`/api/v1/coordinate/updateCoord/${jobId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          currentCoords: { latitude: '27.7172', longitude: '85.3240' }
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Invalid Token");
    });

    it('should return 404 if job not found', async () => {
      Job.findByIdAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/v1/coordinate/updateCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          currentCoords: { latitude: '27.7172', longitude: '85.3240' }
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Job not found');
    });

    it('should handle database error during update', async () => {
      Job.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .patch(`/api/v1/coordinate/updateCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          currentCoords: { latitude: '27.7172', longitude: '85.3240' }
        });

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal Server Error');
    });

    it('should work with admin token', async () => {
      const updatedJob = {
        _id: jobId,
        currentCoords: { latitude: '27.7172', longitude: '85.3240' },
        status: 'in-transit'
      };

      Job.findByIdAndUpdate.mockResolvedValue(updatedJob);

      const res = await request(app)
        .patch(`/api/v1/coordinate/updateCoord/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentCoords: { latitude: '27.7172', longitude: '85.3240' }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/coordinate/getLiveCoord/:jobId', () => {
    it('should get live coordinates with valid driver token', async () => {
      const job = {
        _id: jobId,
        currentCoords: { latitude: '27.7172', longitude: '85.3240' },
        status: 'in-transit'
      };

      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(job)
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getLiveCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.coordinate).toEqual(job.currentCoords);
      expect(Job.findById).toHaveBeenCalledWith(jobId);
    });

    it('should return 401 without authorization header', async () => {
      const res = await request(app)
        .get(`/api/v1/coordinate/getLiveCoord/${jobId}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("No token, authorization denied");
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get(`/api/v1/coordinate/getLiveCoord/${jobId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Invalid Token");
    });

    it('should return 404 if job not found', async () => {
      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getLiveCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Job Not found');
    });

    it('should handle database error during retrieval', async () => {
      Job.findById.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getLiveCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('internal server error');
    });

    it('should work with admin token', async () => {
      const job = {
        _id: jobId,
        currentCoords: { latitude: '27.7172', longitude: '85.3240' }
      };

      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(job)
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getLiveCoord/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/coordinate/getCoord/:jobId', () => {
    it('should get pickup and dropoff coordinates with valid driver token', async () => {
      const job = {
        _id: jobId,
        pickupInfo: {
          name: 'John Doe',
          phone: '1234567890',
          latitude: '27.7172',
          longitude: '85.3240'
        },
        dropoffInfo: {
          name: 'Jane Smith',
          phone: '0987654321',
          latitude: '27.7000',
          longitude: '85.3000'
        }
      };

      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(job)
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Coordinates fetched successfully');
      expect(res.body.pickupCoordinates).toEqual({
        latitude: job.pickupInfo.latitude,
        longitude: job.pickupInfo.longitude
      });
      expect(res.body.dropoffCoordinates).toEqual({
        latitude: job.dropoffInfo.latitude,
        longitude: job.dropoffInfo.longitude
      });
    });

    it('should return 401 without authorization header', async () => {
      const res = await request(app)
        .get(`/api/v1/coordinate/getCoord/${jobId}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("No token, authorization denied");
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get(`/api/v1/coordinate/getCoord/${jobId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Invalid Token");
    });

    it('should return 404 if job not found', async () => {
      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Job not found');
    });

    it('should handle database error during coordinate fetch', async () => {
      Job.findById.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal Server Error');
    });
  });

  describe('GET /api/v1/coordinate/getAllCoord/:jobId', () => {
    it('should get all coordinates without authentication (public endpoint)', async () => {
      const job = {
        _id: jobId,
        pickupInfo: {
          name: 'John Doe',
          phone: '1234567890',
          latitude: '27.7172',
          longitude: '85.3240'
        },
        dropoffInfo: {
          name: 'Jane Smith',
          phone: '0987654321',
          latitude: '27.7000',
          longitude: '85.3000'
        },
        currentCoords: {
          latitude: '27.7100',
          longitude: '85.3100'
        }
      };

      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(job)
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getAllCoord/${jobId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Job coordinates fetched successfully');
      expect(res.body.data).toEqual({
        jobId: job._id,
        pickupInfo: job.pickupInfo,
        dropoffInfo: job.dropoffInfo,
        currentCoords: job.currentCoords
      });
      expect(Job.findById).toHaveBeenCalledWith(jobId, {
        pickupInfo: 1,
        dropoffInfo: 1,
        currentCoords: 1,
        _id: 1
      });
    });

    it('should return 404 if job not found for all coordinates', async () => {
      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getAllCoord/${jobId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Job not found');
    });

    it('should handle database error during all coordinates fetch', async () => {
      Job.findById.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getAllCoord/${jobId}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal Server Error');
    });

    it('should work with authentication tokens (though not required)', async () => {
      const job = {
        _id: jobId,
        pickupInfo: { name: 'John', phone: '123', latitude: '27.7', longitude: '85.3' },
        dropoffInfo: { name: 'Jane', phone: '456', latitude: '27.8', longitude: '85.4' },
        currentCoords: { latitude: '27.75', longitude: '85.35' }
      };

      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(job)
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getAllCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle job with null current coordinates', async () => {
      const job = {
        _id: jobId,
        pickupInfo: { name: 'John', phone: '123', latitude: '27.7', longitude: '85.3' },
        dropoffInfo: { name: 'Jane', phone: '456', latitude: '27.8', longitude: '85.4' },
        currentCoords: null
      };

      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(job)
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getAllCoord/${jobId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentCoords).toBe(null);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle expired token', async () => {
      const expiredPayload = {
        _id: driverId,
        email: 'driver@test.com',
        role: 'driver'
      };
      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET, { expiresIn: '-1h' });

      const res = await request(app)
        .get(`/api/v1/coordinate/getLiveCoord/${jobId}`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Token expired");
    });

    it('should handle malformed authorization header', async () => {
      const res = await request(app)
        .patch(`/api/v1/coordinate/updateCoord/${jobId}`)
        .set('Authorization', 'InvalidFormat token')
        .send({
          currentCoords: { latitude: '27.7172', longitude: '85.3240' }
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("No token, authorization denied");
    });

    it('should handle invalid ObjectId format', async () => {
      const invalidJobId = 'invalid-job-id';
      
      // Mock MongoDB ObjectId validation error
      Job.findById.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Cast to ObjectId failed'))
      });

      const res = await request(app)
        .get(`/api/v1/coordinate/getLiveCoord/${invalidJobId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('should handle empty coordinate update', async () => {
      const updatedJob = {
        _id: jobId,
        currentCoords: {},
        status: 'pending'
      };

      Job.findByIdAndUpdate.mockResolvedValue(updatedJob);

      const res = await request(app)
        .patch(`/api/v1/coordinate/updateCoord/${jobId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          currentCoords: {}
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job.currentCoords).toEqual({});
    });
  });
});