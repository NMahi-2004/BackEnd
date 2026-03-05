const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Question ID is required']
  },
  answerText: {
    type: String,
    trim: true,
    maxlength: [5000, 'Answer text cannot exceed 5000 characters']
  },
  fileUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number
  },
  marks: {
    type: Number,
    min: [0, 'Marks cannot be negative'],
    default: 0
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters']
  }
}, {
  _id: true
});

const assignmentSubmissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, 'Assignment reference is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  answers: [answerSchema],
  content: {
    type: String,
    trim: true,
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  file: {
    filename: {
      type: String
    },
    originalName: {
      type: String
    },
    path: {
      type: String
    },
    mimetype: {
      type: String
    },
    size: {
      type: Number
    }
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLateSubmission: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'evaluated', 'returned'],
    default: 'draft'
  },
  totalMarks: {
    type: Number,
    min: [0, 'Total marks cannot be negative'],
    default: 0
  },
  obtainedMarks: {
    type: Number,
    min: [0, 'Obtained marks cannot be negative'],
    default: 0
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100'],
    default: 0
  },
  generalFeedback: {
    type: String,
    trim: true,
    maxlength: [2000, 'General feedback cannot exceed 2000 characters']
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  evaluatedAt: {
    type: Date
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one submission per student per assignment
assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

// Pre-save middleware to calculate marks and percentages
assignmentSubmissionSchema.pre('save', function(next) {
  // Calculate obtained marks from individual answers
  this.obtainedMarks = this.answers.reduce((total, answer) => {
    return total + (answer.marks || 0);
  }, 0);
  
  // Calculate percentage
  if (this.totalMarks > 0) {
    this.percentage = Math.round((this.obtainedMarks / this.totalMarks) * 100 * 100) / 100; // Round to 2 decimal places
  }
  
  // Update last modified timestamp
  this.lastModified = new Date();
  
  // Set evaluation timestamp if being evaluated
  if (this.status === 'evaluated' && !this.evaluatedAt) {
    this.evaluatedAt = new Date();
  }
  
  next();
});

// Virtual to get grade based on percentage
assignmentSubmissionSchema.virtual('grade').get(function() {
  if (this.percentage >= 90) return 'A+';
  if (this.percentage >= 80) return 'A';
  if (this.percentage >= 70) return 'B+';
  if (this.percentage >= 60) return 'B';
  if (this.percentage >= 50) return 'C+';
  if (this.percentage >= 40) return 'C';
  if (this.percentage >= 30) return 'D';
  return 'F';
});

// Virtual to check if submission is late
assignmentSubmissionSchema.virtual('isLate').get(function() {
  return this.isLateSubmission;
});

// Static method to find submissions for an assignment
assignmentSubmissionSchema.statics.findByAssignment = function(assignmentId) {
  return this.find({ assignment: assignmentId })
    .populate('student', 'fullName email username')
    .sort({ submittedAt: -1 });
};

// Static method to find submissions by student
assignmentSubmissionSchema.statics.findByStudent = function(studentId) {
  return this.find({ student: studentId })
    .populate('assignment', 'title course dueDate totalMarks')
    .sort({ submittedAt: -1 });
};

// Instance method to check if submission can be edited
assignmentSubmissionSchema.methods.canEdit = function() {
  return this.status === 'draft';
};

// Instance method to submit the assignment
assignmentSubmissionSchema.methods.submit = async function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  return await this.save();
};

// Instance method to evaluate the submission
assignmentSubmissionSchema.methods.evaluate = async function(evaluatorId, totalMarks) {
  this.status = 'evaluated';
  this.evaluatedBy = evaluatorId;
  this.evaluatedAt = new Date();
  this.totalMarks = totalMarks;
  return await this.save();
};

// Ensure virtual fields are serialized
assignmentSubmissionSchema.set('toJSON', { virtuals: true });
assignmentSubmissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);