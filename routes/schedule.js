const express = require('express');
const router = express.Router();
const { getStudentSchedule } = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/student', authorize('student'), getStudentSchedule);

module.exports = router;