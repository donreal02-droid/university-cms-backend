const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @desc    Get all submissions for a teacher
// @route   GET /api/submissions/teacher
// @access  Private/Teacher
const getTeacherSubmissions = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Get all assignments created by this teacher
    const assignments = await Assignment.find({ teacher: teacherId })
      .populate('subject', 'name code');

    const assignmentIds = assignments.map(a => a._id);

    // Get all submissions for these assignments
    const submissions = await Submission.find({ 
      assignment: { $in: assignmentIds } 
    })
    .populate('student', 'name email enrollmentNumber')
    .populate({
      path: 'assignment',
      populate: { path: 'subject', select: 'name code' }
    })
    .sort('-submittedAt');

    res.json(submissions);
  } catch (error) {
    console.error('Get teacher submissions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get submissions by assignment
// @route   GET /api/submissions/assignment/:assignmentId
// @access  Private/Teacher
const getSubmissionsByAssignment = async (req, res) => {
  try {
    const submissions = await Submission.find({ 
      assignment: req.params.assignmentId 
    })
    .populate('student', 'name email enrollmentNumber')
    .sort('-submittedAt');

    res.json(submissions);
  } catch (error) {
    console.error('Get submissions by assignment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get student's submissions
// @route   GET /api/submissions/student
// @access  Private/Student
const getStudentSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate({
        path: 'assignment',
        populate: { path: 'subject', select: 'name code' }
      })
      .sort('-submittedAt');

    res.json(submissions);
  } catch (error) {
    console.error('Get student submissions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get submission by ID
// @route   GET /api/submissions/:id
// @access  Private
const getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('student', 'name email enrollmentNumber')
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
    console.error('Get submission by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Download submission file
// @route   GET /api/submissions/:id/download
// @access  Private
const downloadSubmission = async (req, res) => {
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

    if (req.user.role === 'teacher' && submission.assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if file exists
    if (!fs.existsSync(submission.fileUrl)) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.download(path.resolve(submission.fileUrl));
  } catch (error) {
    console.error('Download submission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Grade submission
// @route   PUT /api/submissions/:id/grade
// @access  Private/Teacher
const gradeSubmission = async (req, res) => {
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
    console.error('Grade submission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete submission
// @route   DELETE /api/submissions/:id
// @access  Private/Teacher
const deleteSubmission = async (req, res) => {
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
    if (fs.existsSync(submission.fileUrl)) {
      fs.unlinkSync(submission.fileUrl);
    }

    // Remove submission reference from assignment
    await Assignment.findByIdAndUpdate(
      submission.assignment._id,
      { $pull: { submissions: submission._id } }
    );

    await submission.deleteOne();
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getTeacherSubmissions,
  getSubmissionsByAssignment,
  getStudentSubmissions,
  getSubmissionById,
  downloadSubmission,
  gradeSubmission,
  deleteSubmission
};