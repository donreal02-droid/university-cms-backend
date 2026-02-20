const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  uploadNote,
  getNotesBySubject,
  getStudentNotes,
  getRecentNotes,
  downloadNote,
  deleteNote
} = require('../controllers/noteController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const noteValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('subjectId').notEmpty().withMessage('Subject ID is required')
];

router.use(protect);

// IMPORTANT: Specific routes must come before parameterized routes
// Student route - Get all notes for logged-in student
router.get('/student', authorize('student'), getStudentNotes);
router.get('/recent', authorize('student'), getRecentNotes);

// Get notes by subject
router.get('/subject/:subjectId', getNotesBySubject);

// Download note
router.get('/:id/download', downloadNote);

// Create note (teacher only)
router.route('/')
  .post(authorize('teacher', 'admin'), upload.single('note'), noteValidation, uploadNote);

// Delete note
router.delete('/:id', authorize('teacher', 'admin'), deleteNote);

module.exports = router;