const User = require('../models/User');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      totalTeachers,
      totalDepartments,
      totalSubjects,
      activeAssignments,
      recentSubmissions
    ] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      Department.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      Assignment.countDocuments({ 
        isActive: true,
        deadline: { $gte: new Date() }
      }),
      Assignment.aggregate([
        { $unwind: '$submissions' },
        { $match: { 'submissions.status': 'submitted' } },
        { $sort: { 'submissions.submittedAt': -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: 'submissions.student',
            foreignField: '_id',
            as: 'student'
          }
        },
        {
          $project: {
            'student.name': 1,
            'student.enrollmentNumber': 1,
            'submissions.submittedAt': 1,
            title: 1
          }
        }
      ])
    ]);

    res.json({
      totalStudents,
      totalTeachers,
      totalDepartments,
      totalSubjects,
      activeAssignments,
      recentSubmissions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get department wise statistics
// @route   GET /api/reports/departments
// @access  Private/Admin
const getDepartmentStats = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true });

    const stats = await Promise.all(
      departments.map(async (dept) => {
        const [students, teachers, subjects] = await Promise.all([
          User.countDocuments({ department: dept._id, role: 'student' }),
          User.countDocuments({ department: dept._id, role: 'teacher' }),
          Subject.countDocuments({ department: dept._id })
        ]);

        return {
          department: dept.name,
          code: dept.code,
          students,
          teachers,
          subjects,
          studentTeacherRatio: teachers > 0 ? (students / teachers).toFixed(1) : 0
        };
      })
    );

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get student performance report
// @route   GET /api/reports/student/:studentId
// @access  Private
const getStudentPerformance = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Get student's assignments
    const assignments = await Assignment.find({
      'submissions.student': studentId
    }).populate('subject', 'name code');

    const assignmentStats = assignments.map(assignment => {
      const submission = assignment.submissions.find(
        s => s.student.toString() === studentId
      );
      return {
        assignmentTitle: assignment.title,
        subject: assignment.subject,
        submittedAt: submission?.submittedAt,
        marks: submission?.marks,
        maxMarks: assignment.maxMarks,
        status: submission?.status || 'pending',
        percentage: submission?.marks ? (submission.marks / assignment.maxMarks) * 100 : null
      };
    });

    // Get student's quizzes
    const quizzes = await Quiz.find({
      'attempts.student': studentId
    }).populate('subject', 'name code');

    const quizStats = quizzes.map(quiz => {
      const attempt = quiz.attempts.find(
        a => a.student.toString() === studentId
      );
      return {
        quizTitle: quiz.title,
        subject: quiz.subject,
        score: attempt?.score,
        totalMarks: quiz.totalMarks,
        percentage: attempt?.percentage,
        submittedAt: attempt?.submittedAt
      };
    });

    // Calculate overall statistics
    const gradedAssignments = assignmentStats.filter(a => a.status === 'graded');
    const avgAssignmentScore = gradedAssignments.length > 0
      ? gradedAssignments.reduce((sum, a) => sum + a.percentage, 0) / gradedAssignments.length
      : 0;

    const completedQuizzes = quizStats.filter(q => q.percentage !== null);
    const avgQuizScore = completedQuizzes.length > 0
      ? completedQuizzes.reduce((sum, q) => sum + q.percentage, 0) / completedQuizzes.length
      : 0;

    res.json({
      assignments: assignmentStats,
      quizzes: quizStats,
      statistics: {
        totalAssignments: assignmentStats.length,
        completedAssignments: gradedAssignments.length,
        pendingAssignments: assignmentStats.length - gradedAssignments.length,
        totalQuizzes: completedQuizzes.length,
        averageAssignmentScore: avgAssignmentScore.toFixed(2),
        averageQuizScore: avgQuizScore.toFixed(2),
        overallPerformance: ((avgAssignmentScore + avgQuizScore) / 2).toFixed(2)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getDepartmentStats,
  getStudentPerformance
};