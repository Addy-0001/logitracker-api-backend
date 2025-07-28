const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const generateToken = require("../utils/tokenHelpers");

/**
 * Creates a new driver user account
 * 
 * @async
 * @function signup
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.firstName - User's first name
 * @param {string} req.body.lastName - User's last name
 * @param {string} req.body.email - User's email address (must be unique)
 * @param {string} req.body.phone - User's phone number (must be unique)
 * @param {string} req.body.password - User's password
 * @param {string} req.body.confirmPassword - Password confirmation (must match password)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status and message
 * @throws {Error} If server error occurs during user creation
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
                message: "All fields are required: firstName, lastName, email, phone, password, confirmPassword"
            });
        }
    
        const userExist = await User.findOne({email});
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
    
        const isMatch = password == confirmPassword;
    
        if(!isMatch) {
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
    } catch(error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

/**
 * Authenticates a driver user and provides a JWT token
 * 
 * @async
 * @function driverLogin
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status, message, token and user data
 * @throws {Error} If server error occurs during authentication
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
                message: 'Invalid Credentials'
            });
        }

        const token = generateToken(user);
        const { password: _, ...userWithoutPassword } = user.toObject();

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
            token: token,
            user: userWithoutPassword
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Something went wrong',
            error: error.message
        });
    }
};


/**
 * Authenticates an admin user and provides a JWT token
 * 
 * @async
 * @function adminLogin
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - Admin's email address
 * @param {string} req.body.password - Admin's password
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status, message and token
 * @throws {Error} If server error occurs during authentication or if user is not an admin
 */
exports.adminLogin = async (req, res) => {
    const {email, password} = req.body;
    try {
        if(!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Fill up all the fields",
            });
        }
        const user = await User.findOne({email});
        if(!user) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }
        const isAdmin = user.role === "admin";

        if(!isAdmin) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized Access",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid Credentials"
            });
        }
        const token = generateToken(user);
        res.status(200).json({
            success: true, // Fixed typo here
            message: "Logged in successfully",
            token: token
        });
    } catch(error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};