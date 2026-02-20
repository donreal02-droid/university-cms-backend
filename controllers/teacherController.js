const User = require('../models/User');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');

// @desc    Get teacher dashboard stats
// @route   GET /api/teacher/stats
// @access  Private/Teacher
const getTeacherStats = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Get subjects taught by this teacher
    const subjects = await Subject.find({ teacher: teacherId });
    const subjectIds = subjects.map(s => s._id);

    // Get assignments created by this teacher
    const assignments = await Assignment.find({ teacher: teacherId });
    
    // Get all submissions for these assignments
    const submissions = await Submission.find({
      assignment: { $in: assignments.map(a => a._id) }
    });

    const stats = {
      totalSubjects: subjects.length,
      totalAssignments: assignments.length,
      totalSubmissions: submissions.length,
      pendingSubmissions: submissions.filter(s => s.status === 'submitted' || s.status === 'late').length,
      gradedSubmissions: submissions.filter(s => s.status === 'graded').length,
      lateSubmissions: submissions.filter(s => s.status === 'late').length
    };

    res.json(stats);
  } catch (error) {
    console.error('Get teacher stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getTeacherStats
};