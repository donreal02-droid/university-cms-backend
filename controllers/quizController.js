const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject');
const User = require('../models/User'); // ADD THIS MISSING IMPORT
const Submission = require('../models/Submission'); // Add this if needed

// @desc    Create quiz
// @route   POST /api/quizzes
// @access  Private/Teacher
const createQuiz = async (req, res) => {
  try {
    const { title, description, subjectId, questions, duration, startDate, endDate } = req.body;

    // Verify subject and teacher
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if teacher is authorized
    if (subject.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to create quizzes for this subject' });
    }

    // Calculate total marks
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    const quiz = await Quiz.create({
      title,
      description,
      subject: subjectId,
      teacher: req.user._id,
      questions,
      totalMarks,
      duration,
      startDate,
      endDate
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get quizzes by subject
// @route   GET /api/quizzes/subject/:subjectId
// @access  Private
const getQuizzesBySubject = async (req, res) => {
  try {
    const now = new Date();
    const quizzes = await Quiz.find({ 
      subject: req.params.subjectId,
      isActive: true,
      endDate: { $gte: now }
    })
    .select(req.user.role === 'student' ? '-questions.correctAnswer' : '')
    .populate('teacher', 'name')
    .sort('startDate');

    res.json(quizzes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get quizzes for student
// @route   GET /api/quizzes/student
// @access  Private/Student
const getStudentQuizzes = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate('department');

    if (!student.department) {
      return res.json([]);
    }

    // Get subjects for student's department and semester
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
    .select('-questions.correctAnswer') // Hide correct answers from students
    .sort('-createdAt');

    res.json(quizzes);
  } catch (error) {
    console.error('Get student quizzes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Start quiz
// @route   POST /api/quizzes/:id/start
// @access  Private/Student
const startQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const now = new Date();
    if (now < quiz.startDate || now > quiz.endDate) {
      return res.status(400).json({ message: 'Quiz is not available at this time' });
    }

    // Check if already attempted
    const existingAttempt = quiz.attempts.find(
      a => a.student.toString() === req.user._id.toString()
    );

    if (existingAttempt) {
      return res.status(400).json({ message: 'You have already attempted this quiz' });
    }

    // Create new attempt
    quiz.attempts.push({
      student: req.user._id,
      startedAt: now,
      status: 'in-progress'
    });

    await quiz.save();

    // Return quiz questions without answers
    const quizData = quiz.toObject();
    quizData.questions = quizData.questions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      marks: q.marks
    }));

    res.json(quizData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Submit quiz
// @route   POST /api/quizzes/:id/submit
// @access  Private/Student
const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body;
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const attempt = quiz.attempts.find(
      a => a.student.toString() === req.user._id.toString() && a.status === 'in-progress'
    );

    if (!attempt) {
      return res.status(400).json({ message: 'No active quiz attempt found' });
    }

    // Calculate score
    let score = 0;
    answers.forEach(answer => {
      const question = quiz.questions[answer.questionIndex];
      if (question && question.correctAnswer === answer.selectedOption) {
        score += question.marks;
      }
    });

    const percentage = (score / quiz.totalMarks) * 100;

    attempt.answers = answers;
    attempt.score = score;
    attempt.percentage = percentage;
    attempt.submittedAt = new Date();
    attempt.status = 'completed';

    await quiz.save();

    res.json({
      message: 'Quiz submitted successfully',
      score,
      totalMarks: quiz.totalMarks,
      percentage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get quiz results
// @route   GET /api/quizzes/:id/results
// @access  Private/Teacher
const getQuizResults = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('attempts.student', 'name enrollmentNumber');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check authorization
    if (quiz.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const results = quiz.attempts
      .filter(a => a.status === 'completed')
      .map(a => ({
        student: a.student,
        score: a.score,
        percentage: a.percentage,
        submittedAt: a.submittedAt
      }));

    res.json({
      quizTitle: quiz.title,
      totalMarks: quiz.totalMarks,
      totalStudents: results.length,
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createQuiz,
  getQuizzesBySubject,
  getStudentQuizzes, // ADD THIS
  startQuiz,
  submitQuiz,
  getQuizResults
};