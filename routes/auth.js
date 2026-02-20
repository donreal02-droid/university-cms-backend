const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const User = require('../models/User');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadProfileImage ,
  deleteAccount,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Validation rules
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'teacher', 'student']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const passwordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, upload.single('profile'), updateProfile);
router.put('/change-password', protect, passwordValidation, changePassword);
router.post('/profile/image', protect, upload.single('profile'), uploadProfileImage);
router.delete('/account', protect, deleteAccount);

// @desc    Forgot password - send reset code
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save code to user (you'll need to add resetCode and resetCodeExpiry to your User model)
    user.resetCode = resetCode;
    user.resetCodeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send email with reset code
    // You'll need to set up nodemailer or an email service
    // For now, just return the code (in production, email it)
    
    res.json({ 
      message: 'Reset code sent to your email',
      // Remove this in production! Only for testing
      devCode: resetCode 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Reset password with code
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({ 
      email,
      resetCode: code,
      resetCodeExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Update password
    user.password = newPassword;
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;