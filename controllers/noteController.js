const Note = require('../models/Note');
const Subject = require('../models/Subject');
const User = require('../models/User'); // Add this if missing
const fs = require('fs');
const path = require('path');

// @desc    Upload note
// @route   POST /api/notes
// @access  Private/Teacher
const uploadNote = async (req, res) => {
  try {
    const { title, description, subjectId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    // Verify subject exists and teacher is assigned
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to upload notes for this subject' });
    }

    const note = await Note.create({
      title,
      description,
      subject: subjectId,
      teacher: req.user._id,
      fileUrl: req.file.path,
      fileType: req.file.mimetype.split('/')[1],
      fileSize: req.file.size
    });

    res.status(201).json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get notes by subject
// @route   GET /api/notes/subject/:subjectId
// @access  Private
const getNotesBySubject = async (req, res) => {
  try {
    const notes = await Note.find({ 
      subject: req.params.subjectId,
      isActive: true 
    })
    .populate('teacher', 'name')
    .sort('-createdAt');

    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Download note
// @route   GET /api/notes/:id/download
// @access  Private
const downloadNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Increment download count
    note.downloads += 1;
    await note.save();

    // Send file
    res.download(path.resolve(note.fileUrl));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private/Teacher
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check authorization
    if (note.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete file from storage
    if (fs.existsSync(note.fileUrl)) {
      fs.unlinkSync(note.fileUrl);
    }

    await note.deleteOne();
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// @desc    Get notes for student (based on their department and semester)
// @route   GET /api/notes/student
// @access  Private/Student
const getStudentNotes = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).populate('department');

    // If student has no department, return empty array
    if (!student.department) {
      console.log('Student has no department:', student.email);
      return res.json([]);
    }

    console.log('Fetching notes for student:', {
      studentId: student._id,
      department: student.department._id,
      semester: student.semester
    });

    // Get subjects for student's department and semester
    const subjects = await Subject.find({
      department: student.department._id,
      semester: student.semester
    });

    const subjectIds = subjects.map(s => s._id);

    // If no subjects found, return empty array
    if (subjectIds.length === 0) {
      return res.json([]);
    }

    // Get notes for these subjects
    const notes = await Note.find({
      subject: { $in: subjectIds },
      isActive: true
    })
    .populate('subject', 'name code')
    .populate('teacher', 'name')
    .sort('-createdAt');

    console.log(`Found ${notes.length} notes for student`);

    res.json(notes);
  } catch (error) {
    console.error('Get student notes error:', error);
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

    // Get subjects for student's department and semester
    const subjects = await Subject.find({
      department: student.department._id,
      semester: student.semester
    });

    const subjectIds = subjects.map(s => s._id);

    // Get recent notes (last 5)
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
  uploadNote,
  getNotesBySubject,
  getStudentNotes,
  getRecentNotes, // ADD THIS
  downloadNote,
  deleteNote
};
