const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Job = require('../../models/job.model');
const User = require('../../models/user.model');
const jobRoutes = require('../../routes/jobRoutes');

// Mock the models
jest.mock('../../models/job.model');
jest.mock('../../models/user.model');

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/job', jobRoutes);
  return app;
};

describe('Job Controller Integration with Middleware', () => {
  let app, driverId, adminId, jobId, adminToken, invalidToken;

  beforeAll(async () => {
    app = createTestApp();
    
    // Setup test data
    driverId = new mongoose.Types.ObjectId().toString();
    adminId = new mongoose.Types.ObjectId().toString();
    jobId = new mongoose.Types.ObjectId().toString();
    
    // Create valid admin JWT token
    const adminPayload = {
      id: adminId,
      role: 'admin',
      email: 'admin@test.com'
    };
    
    adminToken = jwt.sign(adminPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Create invalid token
    invalidToken = 'invalid.jwt.token';
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/job/createJob', () => {
    it('should create a job with valid admin token and driver', async () => {
      // Mock User.findById to return a valid driver
      User.findById.mockResolvedValue({
        _id: driverId,
        role: 'driver',
        name: 'Test Driver'
      });

      // Mock Job constructor and save method
      const mockSavedJob = {
        _id: jobId,
        driverInfo: { id: driverId, name: "Test Driver", phone: "1234567890" },
        pickupInfo: { name: "Pickup", phone: "111", latitude: "27.7", longitude: "85.3" },
        dropoffInfo: { name: "Dropoff", phone: "222", latitude: "27.8", longitude: "85.4" },
        status: "pending"
      };

      Job.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedJob)
      }));

      const res = await request(app)
        .post('/api/v1/job/createJob')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          driverInfo: { id: driverId, name: "Test Driver", phone: "1234567890" },
          pickupInfo: { name: "Pickup", phone: "111", latitude: "27.7", longitude: "85.3" },
          dropoffInfo: { name: "Dropoff", phone: "222", latitude: "27.8", longitude: "85.4" },
          currentCoords: { latitude: "27.7", longitude: "85.3" },
          status: "pending",
          note: "Test job",
          addOns: {}
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(User.findById).toHaveBeenCalledWith(driverId);
    });

    it('should return 401 without authorization header', async () => {
      const res = await request(app)
        .post('/api/v1/job/createJob')
        .send({
          driverInfo: { id: driverId, name: "Test Driver", phone: "1234567890" },
          pickupInfo: { name: "Pickup", phone: "111", latitude: "27.7", longitude: "85.3" },
          dropoffInfo: { name: "Dropoff", phone: "222", latitude: "27.8", longitude: "85.4" }
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("No token, authorization denied");
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/job/createJob')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          driverInfo: { id: driverId, name: "Test Driver", phone: "1234567890" },
          pickupInfo: { name: "Pickup", phone: "111", latitude: "27.7", longitude: "85.3" },
          dropoffInfo: { name: "Dropoff", phone: "222", latitude: "27.8", longitude: "85.4" }
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Invalid Token");
    });

    it('should return 403 with non-admin token', async () => {
      // Create driver token (non-admin)
      const driverPayload = {
        id: driverId,
        role: 'driver',
        email: 'driver@test.com'
      };
      const driverToken = jwt.sign(driverPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

      const res = await request(app)
        .post('/api/v1/job/createJob')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          driverInfo: { id: driverId, name: "Test Driver", phone: "1234567890" },
          pickupInfo: { name: "Pickup", phone: "111", latitude: "27.7", longitude: "85.3" },
          dropoffInfo: { name: "Dropoff", phone: "222", latitude: "27.8", longitude: "85.4" }
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Access denied. Admins only.");
    });

    it('should reject job creation with invalid driver ID', async () => {
      const res = await request(app)
        .post('/api/v1/job/createJob')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          driverInfo: { id: "invalidid" },
          pickupInfo: { name: "Pickup", phone: "111", latitude: "27.7", longitude: "85.3" },
          dropoffInfo: { name: "Dropoff", phone: "222", latitude: "27.8", longitude: "85.4" }
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid driver ID");
    });

    it('should reject job creation with coordinates outside Nepal', async () => {
      User.findById.mockResolvedValue({
        _id: driverId,
        role: 'driver',
        name: 'Test Driver'
      });

      const res = await request(app)
        .post('/api/v1/job/createJob')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          driverInfo: { id: driverId },
          pickupInfo: { name: "Pickup", phone: "111", latitude: "40.0", longitude: "100.0" }, // Outside Nepal
          dropoffInfo: { name: "Dropoff", phone: "222", latitude: "27.8", longitude: "85.4" }
        });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toMatch(/within Nepal/);
    });
  });

  describe('GET /api/v1/job', () => {
    it('should retrieve all jobs (no auth required)', async () => {
      const mockJobs = [
        { _id: jobId, status: 'pending', driverInfo: { name: 'Driver 1' } },
        { _id: 'job2', status: 'delivered', driverInfo: { name: 'Driver 2' } }
      ];

      Job.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockJobs)
        })
      });

      const res = await request(app)
        .get('/api/v1/job');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it('should filter jobs by status', async () => {
      const mockJobs = [
        { _id: jobId, status: 'pending', driverInfo: { name: 'Driver 1' } }
      ];

      Job.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockJobs)
        })
      });

      const res = await request(app)
        .get('/api/v1/job?status=pending');

      expect(res.statusCode).toBe(200);
      expect(Job.find).toHaveBeenCalledWith({ status: 'pending' });
    });
  });

  describe('GET /api/v1/job/getJobForDriver/:driverId', () => {
    it('should retrieve jobs for a specific driver (no auth required)', async () => {
      const mockJobs = [
        { _id: jobId, status: 'pending', driverInfo: { id: driverId, name: 'Driver 1' } }
      ];

      Job.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockJobs)
        })
      });

      const res = await request(app)
        .get(`/api/v1/job/getJobForDriver/${driverId}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(Job.find).toHaveBeenCalledWith({ 'driverInfo.id': driverId });
    });
  });

  describe('GET /api/v1/job/getJobById/:jobId', () => {
    it('should retrieve a job by ID (no auth required)', async () => {
      const mockJob = {
        _id: jobId,
        status: 'pending',
        driverInfo: { id: driverId, name: 'Driver 1' }
      };

      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockJob)
      });

      const res = await request(app)
        .get(`/api/v1/job/getJobById/${jobId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.job._id).toBe(jobId);
    });

    it('should return 404 if job not found', async () => {
      Job.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      const res = await request(app)
        .get(`/api/v1/job/getJobById/${jobId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Job Not Found');
    });
  });

  describe('PATCH /api/v1/job/:jobId/status', () => {
    it('should update job status with admin token', async () => {
      const updatedJob = {
        _id: jobId,
        status: 'delivered',
        driverInfo: { id: driverId, name: 'Driver 1' }
      };

      Job.findByIdAndUpdate.mockResolvedValue(updatedJob);

      const res = await request(app)
        .patch(`/api/v1/job/${jobId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: "delivered" });

      expect(res.statusCode).toBe(200);
      expect(res.body.job.status).toBe("delivered");
    });

    it('should return 401 without token for status update', async () => {
      const res = await request(app)
        .patch(`/api/v1/job/${jobId}/status`)
        .send({ status: "delivered" });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("No token, authorization denied");
    });

    it('should reject invalid status', async () => {
      const res = await request(app)
        .patch(`/api/v1/job/${jobId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: "invalid" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid or missing status");
    });
  });

  describe('PDF Generation Routes', () => {
    describe('GET /api/v1/job/generate-pdf/:id', () => {
      it('should generate PDF with admin token', async () => {
        const mockJob = {
          _id: jobId,
          status: 'pending',
          driverInfo: { name: 'Driver 1', phone: '123456789' },
          pickupInfo: { name: 'Pickup', phone: '111', latitude: '27.7', longitude: '85.3' },
          dropoffInfo: { name: 'Dropoff', phone: '222', latitude: '27.8', longitude: '85.4' },
          note: 'Test job',
          addOns: { fragileItems: false, heavyItem: false },
          isUrgent: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        Job.findById.mockResolvedValue(mockJob);

        const res = await request(app)
          .get(`/api/v1/job/generate-pdf/${jobId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('PDF generated successfully');
        expect(res.body.filePath).toContain(`job-${jobId}.pdf`);
      });

      it('should return 401 without token for PDF generation', async () => {
        const res = await request(app)
          .get(`/api/v1/job/generate-pdf/${jobId}`);

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe("No token, authorization denied");
      });

      it('should return 404 if job not found for PDF', async () => {
        Job.findById.mockResolvedValue(null);

        const res = await request(app)
          .get(`/api/v1/job/generate-pdf/${jobId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe("Job not found");
      });
    });

    describe('GET /api/v1/job/getAllJobsPdf', () => {
      it('should get all job PDFs with admin token', async () => {
        // Mock fs operations (would need to mock fs module)
        const res = await request(app)
          .get('/api/v1/job/getAllJobsPdf')
          .set('Authorization', `Bearer ${adminToken}`);

        // This might return 404 if pdfs directory doesn't exist, which is expected
        expect([200, 404]).toContain(res.statusCode);
      });

      it('should return 401 without token for getAllJobsPdf', async () => {
        const res = await request(app)
          .get('/api/v1/job/getAllJobsPdf');

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe("No token, authorization denied");
      });
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle malformed Authorization header', async () => {
      const res = await request(app)
        .post('/api/v1/job/createJob')
        .set('Authorization', 'InvalidFormat')
        .send({
          driverInfo: { id: driverId }
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("No token, authorization denied");
    });

    it('should handle expired token', async () => {
      const expiredPayload = {
        id: adminId,
        role: 'admin',
        email: 'admin@test.com'
      };
      
      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET, { expiresIn: '-1h' });

      const res = await request(app)
        .post('/api/v1/job/createJob')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          driverInfo: { id: driverId }
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Token expired");
    });

    it('should handle missing Authorization header completely', async () => {
      const res = await request(app)
        .post('/api/v1/job/createJob')
        .send({
          driverInfo: { id: driverId }
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("No token, authorization denied");
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      Job.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      });

      const res = await request(app)
        .get('/api/v1/job');

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Failed to fetch jobs');
    });
  });
});