const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createQuiz,
  getQuizzesBySubject,
  getStudentQuizzes,
  startQuiz,
  submitQuiz,
  getQuizResults
} = require('../controllers/quizController');
const { protect, authorize } = require('../middleware/auth');

const quizValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('subjectId').notEmpty().withMessage('Subject ID is required'),
  body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
];

router.use(protect);
router.get('/student', authorize('student'), getStudentQuizzes);

router.route('/')
  .post(authorize('teacher'), quizValidation, createQuiz);

router.get('/subject/:subjectId', getQuizzesBySubject);
router.post('/:id/start', authorize('student'), startQuiz);
router.post('/:id/submit', authorize('student'), submitQuiz);
router.get('/:id/results', authorize('teacher', 'admin'), getQuizResults);

module.exports = router;