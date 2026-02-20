const express = require('express');
const router = express.Router();
const { getAdminDashboardStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/dashboard/admin
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get('/admin', protect, authorize('admin'), getAdminDashboardStats);

module.exports = router;