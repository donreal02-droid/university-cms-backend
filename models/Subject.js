const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  credits: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  syllabus: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
subjectSchema.index({ department: 1, semester: 1 });
subjectSchema.index({ teacher: 1 });

module.exports = mongoose.model('Subject', subjectSchema);