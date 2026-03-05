const mongoose = require('mongoose');

const courseMaterialSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: [true, 'Material title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required']
  },
  fileName: {
    type: String,
    required: [true, 'File name is required']
  },
  fileSize: {
    type: Number
  },
  fileType: {
    type: String,
    default: 'application/pdf'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
courseMaterialSchema.index({ courseId: 1, isActive: 1 });
courseMaterialSchema.index({ facultyId: 1, createdAt: -1 });

// Static method to get course materials
courseMaterialSchema.statics.getCourseMaterials = function(courseId) {
  return this.find({ courseId, isActive: true })
    .populate('facultyId', 'name email')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('CourseMaterial', courseMaterialSchema);
