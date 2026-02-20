const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required']
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
  fileUrl: {
    type: String
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 1
  },
  deadline: {
    type: Date,
    required: true
  },
  submissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
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

// Index for efficient queries
assignmentSchema.index({ subject: 1, deadline: 1 });
assignmentSchema.index({ teacher: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);