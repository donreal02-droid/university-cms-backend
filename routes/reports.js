const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getDepartmentStats,
  getStudentPerformance
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', authorize('admin'), getDashboardStats);
router.get('/departments', authorize('admin'), getDepartmentStats);
router.get('/student/:studentId', authorize('admin', 'teacher', 'student'), getStudentPerformance);

module.exports = router;