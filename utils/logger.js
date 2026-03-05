const ActivityLog = require('../models/ActivityLog');

/**
 * Log user activity to database
 * @param {Object} logData - Activity log data
 * @param {Object} req - Express request object (optional)
 */
const logActivity = async (logData, req = null) => {
  try {
    const logEntry = {
      userId: logData.userId,
      username: logData.username,
      userRole: logData.userRole,
      action: logData.action,
      actionType: logData.actionType,
      targetType: logData.targetType,
      targetId: logData.targetId,
      status: logData.status || 'success',
      details: logData.details,
      errorMessage: logData.errorMessage
    };

    // Add IP address and user agent if request is provided
    if (req) {
      logEntry.ipAddress = req.ip || req.connection.remoteAddress;
      logEntry.userAgent = req.get('user-agent');
    }

    await ActivityLog.createLog(logEntry);
    console.log(`📝 Activity logged: ${logData.action} by ${logData.username}`);
  } catch (error) {
    console.error('❌ Error logging activity:', error);
    // Don't throw - logging should not break the main application flow
  }
};

/**
 * Log user login
 */
const logLogin = async (user, req, status = 'success') => {
  await logActivity({
    userId: user._id || user.id,
    username: user.username,
    userRole: user.role,
    action: `${user.role} login`,
    actionType: 'login',
    status
  }, req);
};

/**
 * Log user logout
 */
const logLogout = async (user, req) => {
  await logActivity({
    userId: user._id || user.id,
    username: user.username,
    userRole: user.role,
    action: `${user.role} logout`,
    actionType: 'logout',
    status: 'success'
  }, req);
};

/**
 * Log user creation
 */
const logUserCreated = async (createdBy, newUser, req) => {
  await logActivity({
    userId: createdBy._id || createdBy.id,
    username: createdBy.username,
    userRole: createdBy.role,
    action: `User created: ${newUser.username} (${newUser.role})`,
    actionType: 'create',
    targetType: 'user',
    targetId: newUser._id,
    status: 'success',
    details: {
      createdUsername: newUser.username,
      createdUserRole: newUser.role
    }
  }, req);
};

/**
 * Log user update
 */
const logUserUpdated = async (updatedBy, targetUser, req) => {
  await logActivity({
    userId: updatedBy._id || updatedBy.id,
    username: updatedBy.username,
    userRole: updatedBy.role,
    action: `User edited: ${targetUser.username}`,
    actionType: 'update',
    targetType: 'user',
    targetId: targetUser._id,
    status: 'success'
  }, req);
};

/**
 * Log user status change
 */
const logUserStatusChanged = async (changedBy, targetUser, newStatus, req) => {
  await logActivity({
    userId: changedBy._id || changedBy.id,
    username: changedBy.username,
    userRole: changedBy.role,
    action: `User ${newStatus ? 'enabled' : 'disabled'}: ${targetUser.username}`,
    actionType: 'update',
    targetType: 'user',
    targetId: targetUser._id,
    status: 'success',
    details: { newStatus }
  }, req);
};

/**
 * Log course creation
 */
const logCourseCreated = async (user, course, req) => {
  await logActivity({
    userId: user._id || user.id,
    username: user.username,
    userRole: user.role,
    action: `Course created: ${course.code}`,
    actionType: 'create',
    targetType: 'course',
    targetId: course._id,
    status: 'success',
    details: {
      courseCode: course.code,
      courseTitle: course.title
    }
  }, req);
};

/**
 * Log course deletion
 */
const logCourseDeleted = async (user, course, req) => {
  await logActivity({
    userId: user._id || user.id,
    username: user.username,
    userRole: user.role,
    action: `Course deleted: ${course.code}`,
    actionType: 'delete',
    targetType: 'course',
    targetId: course._id,
    status: 'success'
  }, req);
};

/**
 * Log quiz creation
 */
const logQuizCreated = async (user, quiz, req) => {
  await logActivity({
    userId: user._id || user.id,
    username: user.username,
    userRole: user.role,
    action: `Quiz created: ${quiz.title}`,
    actionType: 'create',
    targetType: 'quiz',
    targetId: quiz._id,
    status: 'success'
  }, req);
};

/**
 * Log assignment creation
 */
const logAssignmentCreated = async (user, assignment, req) => {
  await logActivity({
    userId: user._id || user.id,
    username: user.username,
    userRole: user.role,
    action: `Assignment created: ${assignment.title}`,
    actionType: 'create',
    targetType: 'assignment',
    targetId: assignment._id,
    status: 'success'
  }, req);
};

/**
 * Log failed action
 */
const logFailedAction = async (user, action, errorMessage, req) => {
  await logActivity({
    userId: user?._id || user?.id,
    username: user?.username || 'unknown',
    userRole: user?.role || 'unknown',
    action,
    actionType: 'other',
    status: 'failure',
    errorMessage
  }, req);
};

/**
 * Log password change
 */
const logPasswordChange = async (user, req) => {
  await logActivity({
    userId: user._id || user.id,
    username: user.username,
    userRole: user.role,
    action: `Password changed`,
    actionType: 'update',
    targetType: 'user',
    targetId: user._id,
    status: 'success'
  }, req);
};

module.exports = {
  logActivity,
  logLogin,
  logLogout,
  logUserCreated,
  logUserUpdated,
  logUserStatusChanged,
  logCourseCreated,
  logCourseDeleted,
  logQuizCreated,
  logAssignmentCreated,
  logFailedAction,
  logPasswordChange
};
