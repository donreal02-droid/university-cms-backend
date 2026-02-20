const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Department code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  faculty: {
    type: String,
    required: [true, 'Faculty name is required'],
    trim: true
  },
  totalSemesters: {
    type: Number,
    required: true,
    default: 8,
    min: 1,
    max: 8 // Maximum 8 semesters
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  headOfDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  semesters: [{
    number: {
      type: Number,
      required: true,
      min: 1,
      max: 8 // Maximum 8 semesters
    },
    name: {
      type: String,
      trim: true,
      default: function() {
        return `Semester ${this.number}`;
      }
    },
    subjects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to ensure semesters array matches totalSemesters
departmentSchema.pre('save', function(next) {
  if (this.semesters.length !== this.totalSemesters) {
    // Regenerate semesters array if needed
    const newSemesters = [];
    for (let i = 1; i <= this.totalSemesters; i++) {
      const existingSem = this.semesters.find(s => s.number === i);
      newSemesters.push({
        number: i,
        name: existingSem?.name || `Semester ${i}`,
        subjects: existingSem?.subjects || []
      });
    }
    this.semesters = newSemesters;
  }
  next();
});

module.exports = mongoose.model('Department', departmentSchema);