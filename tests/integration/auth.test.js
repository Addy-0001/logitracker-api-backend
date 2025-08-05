const { signup, driverLogin, adminLogin } = require('../../controllers/authController');
const User = require('../../models/user.model');
const bcrypt = require('bcryptjs');
const generateToken = require('../../utils/tokenHelpers');

jest.mock('../../models/user.model');
jest.mock('bcryptjs');
jest.mock('../../utils/tokenHelpers');

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // --- signup tests ---
  describe('signup', () => {
    it('should return 400 if required fields missing', async () => {
      req.body = { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' };
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'All fields are required',
      }));
    });

    it('should return 400 if user email already exists', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      };
      User.findOne.mockImplementation(({ email }) => {
        if (email === 'john@example.com') return Promise.resolve({ email: 'john@example.com' });
        return Promise.resolve(null);
      });
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User already exists',
      }));
    });

    it('should return 400 if phone number already used', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john2@example.com',
        phone: '1234567890',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      };
      User.findOne.mockImplementation(({ phone }) => {
        if (phone === '1234567890') return Promise.resolve({ phone: '1234567890' });
        return Promise.resolve(null);
      });
      // Make sure no email found
      User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ phone: '1234567890' });
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Phone number is already used',
      }));
    });

    it('should return 400 if passwords do not match', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john3@example.com',
        phone: '0987654321',
        password: 'Password1!',
        confirmPassword: 'Password2!',
      };
      User.findOne.mockResolvedValue(null); // no email
      User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // no phone
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Both passwords don't match with each other",
      }));
    });

    it('should create user and return 200 on success', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john4@example.com',
        phone: '0987654321',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      };
      User.findOne.mockResolvedValue(null); // no user with email or phone
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      const saveMock = jest.fn().mockResolvedValue(true);
      User.mockImplementation(() => ({ save: saveMock }));

      await signup(req, res);

      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith('Password1!', 'salt');
      expect(saveMock).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: "Your Account is registered successfully",
      }));
    });

    it('should return 500 on server error', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john5@example.com',
        phone: '0987654321',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      };
      User.findOne.mockImplementation(() => { throw new Error('DB error'); });
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server Error',
      }));
    });
  });

  // --- driverLogin tests ---
  describe('driverLogin', () => {
    it('should return 400 if email or password missing', async () => {
      req.body = { email: '', password: '' };
      await driverLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Fill up all fields',
      }));
    });

    it('should return 404 if user not found', async () => {
      req.body = { email: 'notfound@example.com', password: 'Password1!' };
      User.findOne.mockResolvedValue(null);
      await driverLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid Credentials',
      }));
    });

    it('should return 400 if password incorrect', async () => {
      req.body = { email: 'user@example.com', password: 'wrongPassword' };
      User.findOne.mockResolvedValue({ password: 'hashedPassword' });
      bcrypt.compare.mockResolvedValue(false);
      await driverLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid Credentials',
      }));
    });

    it('should return 200 and token if credentials valid', async () => {
      const userObj = {
        _id: 'user123',
        password: 'hashedPassword',
        toObject: () => ({ _id: 'user123', email: 'user@example.com', password: 'hashedPassword' }),
      };
      req.body = { email: 'user@example.com', password: 'Password1!' };
      User.findOne.mockResolvedValue(userObj);
      bcrypt.compare.mockResolvedValue(true);
      generateToken.mockReturnValue('token123');

      await driverLogin(req, res);

      expect(generateToken).toHaveBeenCalledWith(userObj);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Logged in successfully',
        token: 'token123',
        user: expect.objectContaining({ _id: 'user123', email: 'user@example.com' }),
      }));
    });

    it('should return 500 on server error', async () => {
      req.body = { email: 'error@example.com', password: 'Password1!' };
      User.findOne.mockImplementation(() => { throw new Error('DB error'); });
      await driverLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Something went wrong',
      }));
    });
  });

  // --- adminLogin tests ---
  describe('adminLogin', () => {
    it('should return 400 if email or password missing', async () => {
      req.body = { email: '', password: '' };
      await adminLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Fill up all the fields',
      }));
    });

    it('should return 400 if user not found', async () => {
      req.body = { email: 'nouser@example.com', password: 'Password1!' };
      User.findOne.mockResolvedValue(null);
      await adminLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User Not Found',
      }));
    });

    it('should return 401 if user role not admin', async () => {
      req.body = { email: 'user@example.com', password: 'Password1!' };
      User.findOne.mockResolvedValue({ role: 'driver', password: 'hashedPassword' });
      await adminLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Unauthorized Access',
      }));
    });

    it('should return 400 if password incorrect', async () => {
      req.body = { email: 'admin@example.com', password: 'wrongPassword' };
      User.findOne.mockResolvedValue({ role: 'admin', password: 'hashedPassword' });
      bcrypt.compare.mockResolvedValue(false);
      await adminLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid Credentials',
      }));
    });

    it('should return 200 and token if valid admin login', async () => {
      const userObj = { role: 'admin', password: 'hashedPassword' };
      req.body = { email: 'admin@example.com', password: 'Password1!' };
      User.findOne.mockResolvedValue(userObj);
      bcrypt.compare.mockResolvedValue(true);
      generateToken.mockReturnValue('admintoken123');

      await adminLogin(req, res);

      expect(generateToken).toHaveBeenCalledWith(userObj);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Logged in successfully',
        token: 'admintoken123',
      }));
    });

    it('should return 500 on server error', async () => {
      req.body = { email: 'error@example.com', password: 'Password1!' };
      User.findOne.mockImplementation(() => { throw new Error('DB error'); });
      await adminLogin(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server Error',
      }));
    });
  });
});
