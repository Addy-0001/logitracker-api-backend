const { body, validationResult } = require('express-validator');

/**
 * Common validation middleware to check results of validation chains
 * 
 * @function validate
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Calls next() if validation passes, otherwise sends error response
 * 
 * @description
 * This middleware checks if there are any validation errors from previous
 * validator chains. If errors exist, it returns a 400 response with error details.
 * Otherwise, it allows the request to proceed to the next middleware.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation error', 
      errors: errors.array() 
    });
  }
  next();
};

/**
 * User registration validation chain
 * 
 * @type {Array<Function>}
 * @description
 * Validates user registration input with the following rules:
 * - name: required, min 2 characters
 * - email: valid email format, normalized
 * - number: valid phone number format
 * - password: min 8 chars, requires lowercase, uppercase, number, and special character
 * - confirmPassword: must match password field
 */
const signUpValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('phone')
    .isMobilePhone().withMessage('Valid phone number is required'),
  
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  validate
];

/**
 * Login validation chain
 * 
 * @type {Array<Function>}
 * @description
 * Validates user login input with the following rules:
 * - email: valid email format, normalized
 * - password: must not be empty
 */
const loginValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  validate
];

/**
 * Profile update validation chain
 * 
 * @type {Array<Function>}
 * @description
 * Validates profile update input with the following rules:
 * - firstName: optional, min 2 characters if provided
 * - lastName: optional, min 2 characters if provided
 * - email: optional, valid email format if provided, normalized
 * - phone: optional, valid phone number format if provided
 * 
 * All fields are optional to allow partial updates.
 */
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('First name must be at least 2 characters long'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters long'),

  body('email')
    .optional()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),

  body('phone')
    .optional()
    .isMobilePhone().withMessage('Valid phone number is required'),

  validate
];

/**
 * Password change validation chain
 * 
 * @type {Array<Function>}
 * @description
 * Validates password change input with the following rules:
 * - currentPassword: required
 * - newPassword: required, min 6 characters, requires lowercase, uppercase, 
 *   number, and special character
 * - confirmNewPassword: must match newPassword field
 * 
 * Enforces strong password rules to maintain security standards.
 */
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
    .matches(/[a-z]/).withMessage('New password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('New password must contain a number')
    .matches(/[!@#$%^&*]/).withMessage('New password must contain a special character'),

  body('confirmNewPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Confirm password does not match new password');
      }
      return true;
    }),

  validate
];

module.exports = {
    signUpValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation,
    validate
}