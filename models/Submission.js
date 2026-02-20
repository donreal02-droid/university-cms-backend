const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileUrl: {
    type: String,
    required: [true, 'Submission file is required']
  },
  fileType: {
    type: String,
    enum: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'zip', 'other'],
    default: 'other'
  },
  fileSize: {
    type: Number,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  marks: {
    type: Number,
    min: 0
  },
  feedback: {
    type: String,
    trim: true
  },
  gradedAt: {
    type: Date
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['submitted', 'late', 'graded'],
    default: 'submitted'
  },
  isLate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure one submission per student per assignment
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

// Check if submission is late
submissionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Assignment = mongoose.model('Assignment');
    const assignment = await Assignment.findById(this.assignment);
    
    if (assignment && new Date() > new Date(assignment.deadline)) {
      this.isLate = true;
      this.status = 'late';
    }
  }
  next();
});

module.exports = mongoose.model('Submission', submissionSchema);