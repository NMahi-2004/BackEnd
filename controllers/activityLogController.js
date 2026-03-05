const ActivityLog = require('../models/ActivityLog');

// @desc    Get activity logs with filters
// @route   GET /api/activity-logs
// @access  Private (Admin only)
const getActivityLogs = async (req, res) => {
  try {
    const {
      role,
      actionType,
      dateFrom,
      dateTo,
      limit = 100,
      skip = 0
    } = req.query;

    const options = {
      role,
      actionType,
      dateFrom,
      dateTo,
      limit: parseInt(limit),
      skip: parseInt(skip)
    };

    const { logs, total } = await ActivityLog.getLogs({}, options);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      data: logs
    });

  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching activity logs'
    });
  }
};

// @desc    Get activity log statistics
// @route   GET /api/activity-logs/stats
// @access  Private (Admin only)
const getActivityStats = async (req, res) => {
  try {
    const stats = await ActivityLog.aggregate([
      {
        $group: {
          _id: '$actionType',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalLogs = await ActivityLog.countDocuments();
    const recentLogs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        totalLogs,
        statsByType: stats,
        recentLogs
      }
    });

  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching activity statistics'
    });
  }
};

// @desc    Clear old activity logs
// @route   DELETE /api/activity-logs/clear
// @access  Private (Admin only)
const clearOldLogs = async (req, res) => {
  try {
    const { daysOld = 90 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await ActivityLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    console.log(`🗑️ Cleared ${result.deletedCount} old activity logs`);

    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} logs older than ${daysOld} days`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Clear old logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while clearing old logs'
    });
  }
};

module.exports = {
  getActivityLogs,
  getActivityStats,
  clearOldLogs
};
