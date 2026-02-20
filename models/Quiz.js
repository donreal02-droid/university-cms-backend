const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  options: [{
    type: String,
    required: true
  }],
  correctAnswer: {
    type: Number,
    required: true,
    min: 0
  },
  marks: {
    type: Number,
    required: true,
    min: 1
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [questionSchema],
  totalMarks: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 1
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  attempts: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    answers: [{
      questionIndex: Number,
      selectedOption: Number
    }],
    score: Number,
    percentage: Number,
    startedAt: Date,
    submittedAt: Date,
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'in-progress'
    }
  }],
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

module.exports = mongoose.model('Quiz', quizSchema);