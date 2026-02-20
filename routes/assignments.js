const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createAssignment,
  getAssignmentsBySubject,
  getStudentAssignments,
  getTeacherAssignments,
  submitAssignment,
  gradeAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentStats
} = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const assignmentValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('subjectId').notEmpty().withMessage('Subject ID is required'),
  body('maxMarks').isInt({ min: 1 }).withMessage('Max marks must be at least 1'),
  body('deadline').isISO8601().withMessage('Valid deadline is required')
];

router.use(protect);

// Stats route
router.get('/stats', authorize('teacher'), getAssignmentStats);

// Student routes
router.get('/student', authorize('student'), getStudentAssignments);

// Teacher routes
router.get('/teacher', authorize('teacher'), getTeacherAssignments);

// Assignment CRUD
router.route('/')
  .post(authorize('teacher'), upload.single('assignment'), assignmentValidation, createAssignment);

router.route('/:id')
  .get(getAssignmentsBySubject)
  .put(authorize('teacher'), updateAssignment)
  .delete(authorize('teacher'), deleteAssignment);

// Assignment actions
router.get('/subject/:subjectId', getAssignmentsBySubject);
router.post('/:id/submit', authorize('student'), upload.single('submission'), submitAssignment);
router.put('/:id/grade/:submissionId', authorize('teacher'), gradeAssignment);

module.exports = router;