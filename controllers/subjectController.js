const Subject = require('../models/Subject');
const Department = require('../models/Department');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');

// @desc    Create subject
// @route   POST /api/subjects
// @access  Private/Admin
const createSubject = async (req, res) => {
  try {
    const { name, code, description, department, semester, credits, teacher, syllabus } = req.body;

    // Validation
    if (!name || !code || !department || !semester || !credits) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if subject exists
    const subjectExists = await Subject.findOne({ 
      $or: [{ name }, { code: code.toUpperCase() }] 
    });
    
    if (subjectExists) {
      return res.status(400).json({ message: 'Subject with this name or code already exists' });
    }

    // Verify department exists
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(400).json({ message: 'Department not found' });
    }

    // Verify teacher exists and is a teacher
    if (teacher) {
      const teacherExists = await User.findOne({ _id: teacher, role: 'teacher' });
      if (!teacherExists) {
        return res.status(400).json({ message: 'Teacher not found or invalid role' });
      }
    }

    const subject = await Subject.create({
      name,
      code: code.toUpperCase(),
      description: description || '',
      department,
      semester: parseInt(semester),
      credits: parseInt(credits),
      teacher: teacher || null,
      syllabus: syllabus || ''
    });

    // Add subject to department's semester
    const semesterIndex = semester - 1;
    await Department.findByIdAndUpdate(
      department,
      { 
        $push: { 
          [`semesters.${semesterIndex}.subjects`]: subject._id 
        } 
      }
    );

    res.status(201).json(subject);
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private
const getSubjects = async (req, res) => {
  try {
    const { department, semester, teacher, page = 1, limit = 10 } = req.query;
    const query = { isActive: true };

    if (department) query.department = department;
    if (semester) query.semester = parseInt(semester);
    if (teacher) query.teacher = teacher;

    const subjects = await Subject.find(query)
      .populate('department', 'name code')
      .populate('teacher', 'name email')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort('-createdAt');

    const total = await Subject.countDocuments(query);

    res.json({
      subjects,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get subjects by teacher
// @route   GET /api/subjects/teacher
// @access  Private/Teacher
const getSubjectsByTeacher = async (req, res) => {
  try {
    // Get the teacher ID from the authenticated user
    const teacherId = req.user._id;
    
    console.log('Fetching subjects for teacher:', teacherId);
    
    const subjects = await Subject.find({ 
      teacher: teacherId,
      isActive: true 
    })
    .populate('department', 'name code')
    .sort('-createdAt');

    // Get additional stats for each subject
    const subjectsWithStats = await Promise.all(
      subjects.map(async (subject) => {
        const assignments = await Assignment.countDocuments({ subject: subject._id });
        const students = await User.countDocuments({
          role: 'student',
          department: subject.department,
          semester: subject.semester
        });
        
        return {
          ...subject.toObject(),
          assignmentCount: assignments,
          studentCount: students
        };
      })
    );

    res.json(subjectsWithStats);
  } catch (error) {
    console.error('Get subjects by teacher error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get subjects for student
// @route   GET /api/subjects/student
// @access  Private/Student
const getSubjectsByStudent = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate('department');

    if (!student.department) {
      return res.status(400).json({ message: 'Student not assigned to any department' });
    }

    console.log('Fetching subjects for student:', {
      studentId: student._id,
      department: student.department._id,
      semester: student.semester
    });

    const subjects = await Subject.find({
      department: student.department._id,
      semester: student.semester,
      isActive: true
    }).populate('teacher', 'name email');

    console.log(`Found ${subjects.length} subjects for student`);

    res.json(subjects);
  } catch (error) {
    console.error('Get subjects by student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get subject by ID
// @route   GET /api/subjects/:id
// @access  Private
const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('department', 'name code faculty')
      .populate('teacher', 'name email phone');

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json(subject);
  } catch (error) {
    console.error('Get subject by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get subject statistics for teacher
// @route   GET /api/subjects/:id/stats
// @access  Private/Teacher
const getSubjectStats = async (req, res) => {
  try {
    const subjectId = req.params.id;
    const teacherId = req.user._id;

    // Verify the subject belongs to this teacher
    const subject = await Subject.findOne({ _id: subjectId, teacher: teacherId });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found or not authorized' });
    }

    // Get assignments for this subject
    const assignments = await Assignment.find({ subject: subjectId });
    const assignmentIds = assignments.map(a => a._id);

    // Get submissions
    const submissions = await Submission.find({ 
      assignment: { $in: assignmentIds } 
    }).populate('student', 'name');

    // Get enrolled students
    const students = await User.countDocuments({
      role: 'student',
      department: subject.department,
      semester: subject.semester,
      isActive: true
    });

    const totalAssignments = assignments.length;
    const totalSubmissions = submissions.length;
    const pendingSubmissions = submissions.filter(s => s.status === 'submitted' || s.status === 'late').length;
    const gradedSubmissions = submissions.filter(s => s.status === 'graded').length;
    
    // Calculate average score
    const gradedWithMarks = submissions.filter(s => s.marks != null);
    const avgScore = gradedWithMarks.length > 0
      ? Math.round(gradedWithMarks.reduce((acc, s) => acc + s.marks, 0) / gradedWithMarks.length)
      : 0;

    // Calculate pass rate (score >= 40%)
    const passedCount = gradedWithMarks.filter(s => s.marks >= 40).length;
    const passRate = gradedWithMarks.length > 0
      ? Math.round((passedCount / gradedWithMarks.length) * 100)
      : 0;

    res.json({
      totalAssignments,
      totalStudents: students,
      totalSubmissions,
      pendingSubmissions,
      gradedSubmissions,
      avgScore,
      passRate
    });
  } catch (error) {
    console.error('Get subject stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get subject statistics for a student
// @route   GET /api/subjects/:id/student-stats
// @access  Private/Student
const getSubjectStatsForStudent = async (req, res) => {
  try {
    const subjectId = req.params.id;
    const studentId = req.user._id;

    // Verify the subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Get assignments for this subject
    const assignments = await Assignment.find({ 
      subject: subjectId,
      isActive: true 
    });

    // Get student's submissions for these assignments
    const submissions = await Submission.find({
      student: studentId,
      assignment: { $in: assignments.map(a => a._id) }
    });

    // Calculate stats
    const totalAssignments = assignments.length;
    const completedAssignments = submissions.filter(s => s.status === 'graded').length;
    const pendingAssignments = submissions.filter(s => s.status === 'submitted' || s.status === 'late').length;
    const notStarted = totalAssignments - completedAssignments - pendingAssignments;
    
    // Calculate average score
    const gradedSubmissions = submissions.filter(s => s.marks != null);
    const averageScore = gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((acc, s) => acc + s.marks, 0) / gradedSubmissions.length)
      : 0;

    // Calculate best score
    const bestScore = gradedSubmissions.length > 0
      ? Math.max(...gradedSubmissions.map(s => s.marks))
      : 0;

    // Calculate completion rate
    const completionRate = totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0;

    res.json({
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      notStarted,
      averageScore,
      bestScore,
      completionRate
    });
  } catch (error) {
    console.error('Get subject stats for student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private/Admin
const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if code is being changed and if it's unique
    if (req.body.code && req.body.code !== subject.code) {
      const existingSubject = await Subject.findOne({ code: req.body.code.toUpperCase() });
      if (existingSubject) {
        return res.status(400).json({ message: 'Subject code already exists' });
      }
      subject.code = req.body.code.toUpperCase();
    }

    subject.name = req.body.name || subject.name;
    subject.description = req.body.description || subject.description;
    subject.credits = req.body.credits ? parseInt(req.body.credits) : subject.credits;
    subject.teacher = req.body.teacher || subject.teacher;
    subject.syllabus = req.body.syllabus || subject.syllabus;
    subject.isActive = req.body.isActive !== undefined ? req.body.isActive : subject.isActive;

    const updatedSubject = await subject.save();
    res.json(updatedSubject);
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private/Admin
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if subject has any assignments
    const hasAssignments = await Assignment.exists({ subject: subject._id });
    if (hasAssignments) {
      return res.status(400).json({ 
        message: 'Cannot delete subject with existing assignments. Deactivate it instead.' 
      });
    }

    // Remove subject from department
    await Department.updateOne(
      { _id: subject.department },
      { $pull: { [`semesters.${subject.semester - 1}.subjects`]: subject._id } }
    );

    await subject.deleteOne();
    res.json({ message: 'Subject removed successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createSubject,
  getSubjects,
  getSubjectsByTeacher,
  getSubjectsByStudent,
  getSubjectById,
  getSubjectStats,
  getSubjectStatsForStudent, // ADD THIS
  updateSubject,
  deleteSubject
};