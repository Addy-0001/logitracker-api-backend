const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');
const { check } = require('express-validator');

router.get('/me', verifyToken, requireAdmin, userController.getProfile);

router.patch(
    '/update',
    verifyToken,
    requireAdmin,
    [
        check('firstName')
            .optional()
            .isLength({ min: 2 })
            .withMessage('First name must be at least 2 characters'),
        check('lastName')
            .optional()
            .isLength({ min: 2 })
            .withMessage('Last name must be at least 2 characters'),
        check('phone')
            .optional()
            .matches(/^\+?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/)
            .withMessage('Invalid phone number'),
        check('company')
            .optional()
            .notEmpty()
            .withMessage('Company name is required'),
        check('industry')
            .optional()
            .isIn(['logistics', 'manufacturing', 'retail', 'healthcare', 'food', 'other'])
            .withMessage('Invalid industry'),
        check('size')
            .optional()
            .isIn(['1-10', '11-50', '51-200', '201-500', '501+'])
            .withMessage('Invalid company size'),
        check('website')
            .optional()
            .isURL()
            .withMessage('Invalid website URL'),
        check('preferences')
            .optional()
            .isObject()
            .withMessage('Preferences must be an object'),
    ],
    userController.updateProfile,
);

router.post('/avatar', verifyToken, requireAdmin, userController.uploadAvatar);

router.patch(
    '/auth/change-password',
    verifyToken,
    requireAdmin,
    [
        check('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        check('newPassword')
            .isLength({ min: 8 })
            .withMessage('New password must be at least 8 characters'),
    ],
    userController.changePassword,
);

module.exports = router;