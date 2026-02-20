const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createSubject,
  getSubjects,
  getSubjectsByTeacher,
  getSubjectsByStudent,
  getSubjectById,
  getSubjectStats,
  getSubjectStatsForStudent,
  updateSubject,
  deleteSubject
} = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/auth');

const subjectValidation = [
  body('name').notEmpty().withMessage('Subject name is required'),
  body('code').notEmpty().withMessage('Subject code is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
  body('credits').isInt({ min: 1, max: 5 }).withMessage('Credits must be between 1 and 5')
];

router.use(protect);

// =====================================================
// IMPORTANT: SPECIFIC ROUTES MUST COME BEFORE PARAMETERIZED ROUTES
// =====================================================

// Teacher specific routes
router.get('/teacher', authorize('teacher'), getSubjectsByTeacher);

// Student specific routes - THIS MUST COME BEFORE /:id
router.get('/student', authorize('student'), getSubjectsByStudent);

// Subject stats routes
router.get('/stats/teacher/:id', authorize('teacher'), getSubjectStats);
router.get('/stats/student/:id', authorize('student'), getSubjectStatsForStudent);

// Now parameterized routes
router.route('/')
  .get(getSubjects)
  .post(authorize('admin'), subjectValidation, createSubject);

// This must come AFTER all specific routes
router.route('/:id')
  .get(getSubjectById)
  .put(authorize('admin'), updateSubject)
  .delete(authorize('admin'), deleteSubject);

module.exports = router;