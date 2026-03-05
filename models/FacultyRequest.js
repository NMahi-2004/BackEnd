const mongoose = require('mongoose');

const facultyRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestMessage: {
    type: String,
    maxlength: 500
  },
  responseMessage: {
    type: String,
    maxlength: 500
  },
  respondedAt: {
    type: Date
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate requests
facultyRequestSchema.index({ student: 1, faculty: 1 }, { unique: true });

// Static method to get request statistics
facultyRequestSchema.statics.getRequestStats = async function(facultyId) {
  const stats = await this.aggregate([
    { $match: { faculty: new mongoose.Types.ObjectId(facultyId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

module.exports = mongoose.model('FacultyRequest', facultyRequestSchema);