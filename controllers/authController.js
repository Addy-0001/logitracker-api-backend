const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const generateToken = require("../utils/tokenHelpers");

/**
 * Creates a new driver user account
 */
exports.signup = async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword,
    } = req.body;
    try {
        if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const userExist = await User.findOne({ email });
        if (userExist) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
            return res.status(400).json({
                success: false,
                message: "Phone number is already used"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Both passwords don't match with each other"
            });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
            role: "driver",
        });

        await newUser.save();

        res.status(200).json({
            success: true,
            message: "Your Account is registered successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

/**
 * Authenticates a driver user and provides a JWT token
 */
exports.driverLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Fill up all fields',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Credentials',
      });
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user.toObject();

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('driverLogin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message,
    });
  }
};


/**
 * Authenticates an admin user and provides a JWT token
 */
exports.adminLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Fill up all the fields",
            });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }
        if (user.role !== "admin") {
            return res.status(401).json({
                success: false,
                message: "Unauthorized Access",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid Credentials"
            });
        }
        const token = generateToken(user);
        res.status(200).json({
            success: true,
            message: "Logged in successfully",
            token: token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};
