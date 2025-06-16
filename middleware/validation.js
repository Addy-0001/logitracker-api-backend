const { body } = require('express-validator');
exports.validateSignup = [
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2 })
        .withMessage('First name must be at least 2 characters'),
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2 })
        .withMessage('Last name must be at least 2 characters'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('company').trim().notEmpty().withMessage('Company name is required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    body('role')
        .optional()
        .isIn(['admin', 'driver'])
        .withMessage('Role must be either admin or driver'),
];

exports.validateLogin = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
];
