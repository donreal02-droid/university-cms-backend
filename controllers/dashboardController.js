const User = require('../models/User');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');

// @desc    Get admin dashboard statistics
// @route   GET /api/dashboard/admin
// @access  Private/Admin
const getAdminDashboardStats = async (req, res) => {
  try {
    console.log('Dashboard stats requested by admin:', req.user._id);
    
    // Get counts
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    const totalTeachers = await User.countDocuments({ role: 'teacher', isActive: true });
    const totalDepartments = await Department.countDocuments({ isActive: true });
    const totalSubjects = await Subject.countDocuments({ isActive: true });
    
    // Get recent users
    const recentUsers = await User.find({})
      .select('name email role createdAt profileImage')
      .sort('-createdAt')
      .limit(5);
    
    // Get department-wise distribution
    const departmentStats = await Department.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'department',
          as: 'students'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          studentCount: { $size: '$students' }
        }
      }
    ]);

    // Get monthly user registrations
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const registrations = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format registrations for chart
    const formattedRegistrations = registrations.map(reg => ({
      month: `${reg._id.month}/${reg._id.year}`,
      count: reg.count
    }));

    // Get activity stats (assignments, submissions)
    const totalAssignments = await Assignment.countDocuments({ isActive: true });
    const totalSubmissions = await Submission.countDocuments();
    const pendingSubmissions = await Submission.countDocuments({ status: { $ne: 'graded' } });
    const gradedSubmissions = await Submission.countDocuments({ status: 'graded' });

    res.json({
      success: true,
      data: {
        counts: {
          students: totalStudents,
          teachers: totalTeachers,
          departments: totalDepartments,
          subjects: totalSubjects,
          assignments: totalAssignments,
          submissions: totalSubmissions,
          pendingSubmissions,
          gradedSubmissions
        },
        recentUsers,
        departmentStats,
        registrations: formattedRegistrations
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

module.exports = {
  getAdminDashboardStats
};