const mongoose = require('mongoose');

const courseRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Faculty ID is required']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Request message cannot exceed 500 characters']
  },
  responseMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Response message cannot exceed 500 characters']
  },
  respondedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
courseRequestSchema.index({ facultyId: 1, status: 1 });
courseRequestSchema.index({ status: 1, createdAt: -1 });

// Prevent duplicate requests for same student-course combination
courseRequestSchema.index({ studentId: 1, courseId: 1 }, { 
  unique: true,
  partialFilterExpression: { status: { $in: ['pending', 'approved'] } }
});

// Static method to get faculty requests
courseRequestSchema.statics.getFacultyRequests = function(facultyId, status = null) {
  const query = { facultyId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('studentId', 'name email department semester')
    .populate('courseId', 'title code department semester')
    .sort({ createdAt: -1 });
};

// Static method to get student requests
courseRequestSchema.statics.getStudentRequests = function(studentId) {
  return this.find({ studentId })
    .populate('courseId', 'title code department semester')
    .populate('facultyId', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to check if request exists
courseRequestSchema.statics.requestExists = async function(studentId, courseId) {
  const request = await this.findOne({ 
    studentId, 
    courseId,
    status: { $in: ['pending', 'approved'] }
  });
  return !!request;
};

// Static method to get request status
courseRequestSchema.statics.getRequestStatus = async function(studentId, courseId) {
  const request = await this.findOne({ studentId, courseId })
    .sort({ createdAt: -1 });
  return request ? request.status : null;
};

// Instance method to approve request
courseRequestSchema.methods.approve = async function(responseMessage = '') {
  this.status = 'approved';
  this.responseMessage = responseMessage;
  this.respondedAt = new Date();
  
  // Add student to course enrolledStudents
  const Course = mongoose.model('Course');
  await Course.findByIdAndUpdate(
    this.courseId,
    { $addToSet: { enrolledStudents: this.studentId } }
  );
  
  return this.save();
};

// Instance method to reject request
courseRequestSchema.methods.reject = async function(responseMessage = '') {
  this.status = 'rejected';
  this.responseMessage = responseMessage;
  this.respondedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('CourseRequest', courseRequestSchema);
