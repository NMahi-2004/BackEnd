const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Course title cannot exceed 200 characters']
  },
  code: {
    type: String,
    required: [true, 'Course code is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Course code cannot exceed 20 characters'],
    match: [/^[A-Z0-9-]+$/, 'Course code can only contain letters, numbers, and hyphens']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    uppercase: true
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: [1, 'Semester must be at least 1'],
    max: [12, 'Semester cannot exceed 12']
  },
  credits: {
    type: Number,
    required: [true, 'Credits are required'],
    min: [1, 'Credits must be at least 1'],
    max: [10, 'Credits cannot exceed 10']
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Faculty ID is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required']
  },
  maxStudents: {
    type: Number,
    default: 50,
    min: [1, 'Maximum students must be at least 1']
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for better query performance
courseSchema.index({ facultyId: 1, isActive: 1 });
courseSchema.index({ department: 1, semester: 1 });
courseSchema.index({ code: 1 }, { unique: true });

// Virtual for enrolled student count
courseSchema.virtual('enrolledCount').get(function() {
  return this.enrolledStudents.length;
});

// Static method to get faculty courses
courseSchema.statics.getFacultyCourses = function(facultyId) {
  return this.find({ facultyId, isActive: true })
    .populate('facultyId', 'name email department')
    .sort({ createdAt: -1 });
};

// Static method to get courses by department and semester
courseSchema.statics.getCoursesByDepartmentSemester = function(department, semester) {
  return this.find({ 
    department, 
    semester, 
    isActive: true 
  })
  .populate('facultyId', 'name email')
  .sort({ title: 1 });
};

// Instance method to check if student can enroll
courseSchema.methods.canEnroll = function() {
  return this.enrolledStudents.length < this.maxStudents;
};

// Instance method to enroll student
courseSchema.methods.enrollStudent = function(studentId) {
  if (!this.enrolledStudents.includes(studentId) && this.canEnroll()) {
    this.enrolledStudents.push(studentId);
    return this.save();
  }
  throw new Error('Cannot enroll student');
};

module.exports = mongoose.model('Course', courseSchema);