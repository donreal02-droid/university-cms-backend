const User = require('../models/User');
const Department = require('../models/Department');
const Subject = require('../models/Subject');

// @desc    Get university statistics
// @route   GET /api/university/stats
// @access  Public
const getUniversityStats = async (req, res) => {
  try {
    const students = await User.countDocuments({ role: 'student', isActive: true });
    const faculty = await User.countDocuments({ role: 'teacher', isActive: true });
    const programs = await Department.countDocuments({ isActive: true });
    const subjects = await Subject.countDocuments({ isActive: true });

    res.json({
      students,
      faculty,
      programs,
      subjects
    });
  } catch (error) {
    console.error('Error fetching university stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUniversityStats
};