const express = require('express');
const router = express.Router();
const {
  getStudentStats,
  getStudentSubjects,
  getStudentAssignments,
  getStudentQuizzes,
  getStudentSchedule,
  getRecentNotes
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('student'));

router.get('/stats', getStudentStats);
router.get('/subjects', getStudentSubjects);
router.get('/assignments', getStudentAssignments);
router.get('/quizzes', getStudentQuizzes);
router.get('/schedule', getStudentSchedule);
router.get('/notes/recent', getRecentNotes);

module.exports = router;