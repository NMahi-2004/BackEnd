const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [2000, 'Question text cannot exceed 2000 characters']
  },
  questionType: {
    type: String,
    enum: ['descriptive', 'short_answer', 'file_upload'],
    required: [true, 'Question type is required']
  },
  marks: {
    type: Number,
    required: [true, 'Marks are required'],
    min: [0.5, 'Marks must be at least 0.5'],
    max: [100, 'Marks cannot exceed 100']
  },
  order: {
    type: Number,
    required: true,
    min: 1
  }
}, {
  _id: true
});

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  attachmentFile: {
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
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  assignmentType: {
    type: String,
    enum: ['text', 'file_upload', 'mixed'],
    required: [true, 'Assignment type is required']
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks are required'],
    min: [1, 'Total marks must be at least 1'],
    max: [1000, 'Total marks cannot exceed 1000']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  lateSubmissionDeadline: {
    type: Date,
    validate: {
      validator: function(value) {
        if (this.allowLateSubmission && !value) {
          return false;
        }
        if (value && value <= this.dueDate) {
          return false;
        }
        return true;
      },
      message: 'Late submission deadline must be after due date'
    }
  },
  questions: [questionSchema],
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'closed'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  resultsPublished: {
    type: Boolean,
    default: false
  },
  resultsPublishedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual to calculate current status based on dates
assignmentSchema.virtual('currentStatus').get(function() {
  if (!this.isPublished) {
    return 'draft';
  }
  
  const now = new Date();
  const startDate = new Date(this.startDate);
  const dueDate = new Date(this.dueDate);
  
  if (now < startDate) {
    return 'published'; // Published but not yet active
  } else if (now >= startDate && now <= dueDate) {
    return 'active';
  } else {
    return 'closed';
  }
});

// Virtual to check if submissions are allowed
assignmentSchema.virtual('submissionsAllowed').get(function() {
  if (!this.isPublished) {
    return false;
  }
  
  const now = new Date();
  const startDate = new Date(this.startDate);
  const dueDate = new Date(this.dueDate);
  const lateDeadline = this.lateSubmissionDeadline ? new Date(this.lateSubmissionDeadline) : null;
  
  // Check if within normal submission period
  if (now >= startDate && now <= dueDate) {
    return true;
  }
  
  // Check if within late submission period
  if (this.allowLateSubmission && lateDeadline && now > dueDate && now <= lateDeadline) {
    return true;
  }
  
  return false;
});

// Virtual to check if assignment is visible to students
assignmentSchema.virtual('visibleToStudents').get(function() {
  if (!this.isPublished) {
    return false;
  }
  
  const now = new Date();
  const startDate = new Date(this.startDate);
  
  return now >= startDate;
});

// Pre-save middleware to update status
assignmentSchema.pre('save', async function() {
  // Update status based on current conditions
  if (this.isPublished) {
    const now = new Date();
    const startDate = new Date(this.startDate);
    const dueDate = new Date(this.dueDate);
    
    if (now < startDate) {
      this.status = 'published';
    } else if (now >= startDate && now <= dueDate) {
      this.status = 'active';
    } else {
      this.status = 'closed';
    }
  } else {
    this.status = 'draft';
  }
  
  // Set publishedAt timestamp
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Set resultsPublishedAt timestamp
  if (this.resultsPublished && !this.resultsPublishedAt) {
    this.resultsPublishedAt = new Date();
  }
});

// Static method to find assignments for faculty (all assignments)
assignmentSchema.statics.findForFaculty = function(facultyId) {
  return this.find({ createdBy: facultyId }).sort({ createdAt: -1 });
};

// Static method to find assignments for students (only visible assignments)
assignmentSchema.statics.findForStudents = function(course) {
  const now = new Date();
  return this.find({
    course: course,
    isPublished: true,
    startDate: { $lte: now }
  }).sort({ dueDate: 1 });
};

// Instance method to check if assignment is editable
assignmentSchema.methods.isEditable = function() {
  return this.status === 'draft';
};

// Instance method to check if assignment can be published
assignmentSchema.methods.canPublish = function() {
  return this.status === 'draft' && this.questions.length > 0;
};

// Ensure virtual fields are serialized
assignmentSchema.set('toJSON', { virtuals: true });
assignmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Assignment', assignmentSchema);