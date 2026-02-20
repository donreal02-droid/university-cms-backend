const express = require('express');
const router = express.Router();
const { getTeacherStats } = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('teacher'));

router.get('/stats', getTeacherStats);

module.exports = router;