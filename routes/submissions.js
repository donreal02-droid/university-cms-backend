const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const upload = require('../middleware/upload');

// @desc    Get all submissions for a teacher
// @route   GET /api/submissions/teacher
// @access  Private/Teacher
router.get('/teacher', protect, authorize('teacher'), async (req, res) => {
  try {
    const assignments = await Assignment.find({ teacher: req.user._id })
      .populate('subject', 'name code');
    
    const assignmentIds = assignments.map(a => a._id);
    
    const submissions = await Submission.find({ 
      assignment: { $in: assignmentIds } 
    })
    .populate('student', 'name enrollmentNumber')
    .populate({
      path: 'assignment',
      populate: { path: 'subject', select: 'name code' }
    })
    .sort('-submittedAt');

    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get submissions by assignment
// @route   GET /api/submissions/assignment/:assignmentId
// @access  Private/Teacher
router.get('/assignment/:assignmentId', protect, authorize('teacher'), async (req, res) => {
  try {
    const submissions = await Submission.find({ 
      assignment: req.params.assignmentId 
    })
    .populate('student', 'name enrollmentNumber')
    .sort('-submittedAt');

    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get student's submissions
// @route   GET /api/submissions/student
// @access  Private/Student
router.get('/student', protect, authorize('student'), async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate({
        path: 'assignment',
        populate: { path: 'subject', select: 'name code' }
      })
      .sort('-submittedAt');

    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get submission by ID
// @route   GET /api/submissions/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('student', 'name enrollmentNumber')
      .populate({
        path: 'assignment',
        populate: { path: 'subject', select: 'name code teacher' }
      });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check authorization
    if (req.user.role === 'student' && submission.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.user.role === 'teacher' && submission.assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Grade submission
// @route   PUT /api/submissions/:id/grade
// @access  Private/Teacher
router.put('/:id/grade', protect, authorize('teacher'), async (req, res) => {
  try {
    const { marks, feedback } = req.body;
    
    const submission = await Submission.findById(req.params.id)
      .populate({
        path: 'assignment',
        select: 'teacher maxMarks'
      });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if teacher is authorized
    if (submission.assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to grade this submission' });
    }

    // Validate marks
    if (marks > submission.assignment.maxMarks) {
      return res.status(400).json({ 
        message: `Marks cannot exceed ${submission.assignment.maxMarks}` 
      });
    }

    submission.marks = marks;
    submission.feedback = feedback;
    submission.gradedAt = new Date();
    submission.gradedBy = req.user._id;
    submission.status = 'graded';

    await submission.save();

    res.json({ 
      message: 'Submission graded successfully',
      submission 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Delete submission
// @route   DELETE /api/submissions/:id
// @access  Private/Teacher
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate({
        path: 'assignment',
        select: 'teacher'
      });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check authorization
    if (req.user.role === 'teacher' && 
        submission.assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete file from storage
    const fs = require('fs');
    const path = require('path');
    if (fs.existsSync(submission.fileUrl)) {
      fs.unlinkSync(submission.fileUrl);
    }

    await submission.deleteOne();
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// @desc    Download submission file
// @route   GET /api/submissions/:id/download
// @access  Private
router.get('/:id/download', protect, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate({
        path: 'assignment',
        select: 'teacher'
      });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check authorization
    if (req.user.role === 'student' && submission.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.user.role === 'teacher' && 
        submission.assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(submission.fileUrl)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.download(path.resolve(submission.fileUrl));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
module.exports = router;