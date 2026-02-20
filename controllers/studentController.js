const User = require('../models/User');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const Note = require('../models/Note');
const Submission = require('../models/Submission');

// @desc    Get student dashboard stats
// @route   GET /api/student/stats
// @access  Private/Student
const getStudentStats = async (req, res) => {
  try {
    const studentId = req.user._id;
    const student = await User.findById(studentId).populate('department');

    if (!student.department) {
      return res.json({
        assignmentsCompleted: 0,
        averageScore: 0,
        quizzesTaken: 0,
        attendance: 85
      });
    }

    // Get subjects for student's department and semester
    const subjects = await Subject.find({
      department: student.department._id,
      semester: student.semester
    });

    const subjectIds = subjects.map(s => s._id);

    // Get assignments for these subjects
    const assignments = await Assignment.find({
      subject: { $in: subjectIds }
    });

    // Get student's submissions
    const submissions = await Submission.find({
      student: studentId,
      assignment: { $in: assignments.map(a => a._id) }
    });

    // Get quizzes for these subjects
    const quizzes = await Quiz.find({
      subject: { $in: subjectIds }
    });

    // Calculate stats
    const completedAssignments = submissions.filter(s => s.status === 'graded').length;
    const gradedSubmissions = submissions.filter(s => s.marks != null);
    const avgScore = gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((acc, s) => acc + s.marks, 0) / gradedSubmissions.length)
      : 0;

    res.json({
      assignmentsCompleted: completedAssignments,
      averageScore: avgScore,
      quizzesTaken: quizzes.length,
      attendance: 85
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get student subjects
// @route   GET /api/subjects/student
// @access  Private/Student
const getStudentSubjects = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate('department');

    if (!student.department) {
      return res.json([]);
    }

    const subjects = await Subject.find({
      department: student.department._id,
      semester: student.semester,
      isActive: true
    }).populate('teacher', 'name email');

    res.json(subjects);
  } catch (error) {
    console.error('Get student subjects error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get student assignments
// @route   GET /api/assignments/student
// @access  Private/Student
const getStudentAssignments = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate('department');

    if (!student.department) {
      return res.json([]);
    }

    const subjects = await Subject.find({
      department: student.department._id,
      semester: student.semester
    });

    const subjectIds = subjects.map(s => s._id);

    const assignments = await Assignment.find({
      subject: { $in: subjectIds },
      isActive: true
    })
    .populate('subject', 'name code')
    .populate('teacher', 'name')
    .sort('-createdAt');

    // Get submissions for these assignments
    const assignmentsWithStatus = await Promise.all(
      assignments.map(async (assignment) => {
        const submission = await Submission.findOne({
          assignment: assignment._id,
          student: req.user._id
        });
        
        return {
          ...assignment.toObject(),
          status: submission ? submission.status : 'pending',
          submission: submission || null,
          marks: submission?.marks || null,
          feedback: submission?.feedback || null
        };
      })
    );

    res.json(assignmentsWithStatus);
  } catch (error) {
    console.error('Get student assignments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get student quizzes
// @route   GET /api/quizzes/student
// @access  Private/Student
const getStudentQuizzes = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate('department');

    if (!student.department) {
      return res.json([]);
    }

    const subjects = await Subject.find({
      department: student.department._id,
      semester: student.semester
    });

    const subjectIds = subjects.map(s => s._id);

    const quizzes = await Quiz.find({
      subject: { $in: subjectIds },
      isActive: true
    })
    .populate('subject', 'name code')
    .populate('teacher', 'name')
    .select('-questions.correctAnswer')
    .sort('-createdAt');

    res.json(quizzes);
  } catch (error) {
    console.error('Get student quizzes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get student schedule
// @route   GET /api/schedule/student
// @access  Private/Student
const getStudentSchedule = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate('department');

    if (!student.department) {
      return res.json([]);
    }

    const subjects = await Subject.find({
      department: student.department._id,
      semester: student.semester
    }).populate('teacher', 'name');

    // Generate schedule based on subjects
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = [
      { start: '09:00', end: '10:30' },
      { start: '11:00', end: '12:30' },
      { start: '14:00', end: '15:30' }
    ];
    
    const rooms = ['LH-101', 'LH-203', 'Lab-3', 'LH-105', 'LH-208', 'LH-112'];
    const schedule = [];

    subjects.forEach((subject, index) => {
      const dayIndex = index % days.length;
      const timeIndex = Math.floor(index / days.length) % timeSlots.length;
      
      schedule.push({
        _id: subject._id,
        subject: subject.name,
        teacher: subject.teacher?.name || 'TBA',
        room: rooms[index % rooms.length],
        day: days[dayIndex],
        startTime: timeSlots[timeIndex].start,
        endTime: timeSlots[timeIndex].end,
        time: `${timeSlots[timeIndex].start} - ${timeSlots[timeIndex].end}`
      });
    });

    // Sort by day and time
    const dayOrder = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    schedule.sort((a, b) => {
      if (dayOrder[a.day] !== dayOrder[b.day]) {
        return dayOrder[a.day] - dayOrder[b.day];
      }
      return a.startTime.localeCompare(b.startTime);
    });

    res.json(schedule);
  } catch (error) {
    console.error('Get student schedule error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get recent notes for student
// @route   GET /api/notes/recent
// @access  Private/Student
const getRecentNotes = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate('department');

    if (!student.department) {
      return res.json([]);
    }

    const subjects = await Subject.find({
      department: student.department._id,
      semester: student.semester
    });

    const subjectIds = subjects.map(s => s._id);

    const notes = await Note.find({
      subject: { $in: subjectIds },
      isActive: true
    })
    .populate('subject', 'name code')
    .populate('teacher', 'name')
    .sort('-createdAt')
    .limit(5);

    res.json(notes);
  } catch (error) {
    console.error('Get recent notes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getStudentStats,
  getStudentSubjects,
  getStudentAssignments,
  getStudentQuizzes,
  getStudentSchedule,
  getRecentNotes
};