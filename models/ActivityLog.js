const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Some actions might not have a user (system actions)
  },
  username: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['admin', 'faculty', 'student', 'system'],
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  actionType: {
    type: String,
    enum: ['login', 'logout', 'create', 'update', 'delete', 'view', 'other'],
    required: true
  },
  targetType: {
    type: String, // e.g., 'user', 'course', 'quiz', 'assignment'
    trim: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed // Additional details about the action
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Index for better query performance
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ userRole: 1, createdAt: -1 });
activityLogSchema.index({ actionType: 1, createdAt: -1 });

// Static method to create log entry
activityLogSchema.statics.createLog = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating activity log:', error);
    // Don't throw error - logging should not break the main flow
    return null;
  }
};

// Static method to get logs with filters
activityLogSchema.statics.getLogs = async function(filters = {}, options = {}) {
  const {
    role,
    actionType,
    dateFrom,
    dateTo,
    limit = 100,
    skip = 0
  } = options;

  const query = {};

  if (role && role !== 'all') {
    query.userRole = role;
  }

  if (actionType && actionType !== 'all') {
    query.actionType = actionType;
  }

  if (dateFrom) {
    query.createdAt = { ...query.createdAt, $gte: new Date(dateFrom) };
  }

  if (dateTo) {
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    query.createdAt = { ...query.createdAt, $lte: endDate };
  }

  const logs = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await this.countDocuments(query);

  return { logs, total };
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
