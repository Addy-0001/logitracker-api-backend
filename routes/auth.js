const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { check } = require('express-validator');

router.post(
    '/signup',
    [
        check('firstName').isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
        check('lastName').isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
        check('email').isEmail().withMessage('Please enter a valid email'),
        check('company').notEmpty().withMessage('Company name is required'),
        check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        check('role').isIn(['admin', 'driver']).withMessage('Invalid role'), // Restrict to admin
    ],
    authController.signup,
);

router.post(
    '/login',
    [
        check('email').isEmail().withMessage('Please enter a valid email'),
        check('password').notEmpty().withMessage('Password is required'),
    ],
    authController.login,
);

module.exports = router;