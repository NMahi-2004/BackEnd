const CourseRequest = require('../models/CourseRequest');
const Course = require('../models/Course');
const User = require('../models/User');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// @desc    Create course join request (Student)
// @route   POST /api/course-requests
// @access  Private (Student only)
const createCourseRequest = async (req, res) => {
  try {
    const { courseId, requestMessage } = req.body;
    const studentId = req.user.id;

    console.log('📝 ========================================');
    console.log('📝 STUDENT REQUESTING TO JOIN COURSE');
    console.log('📝 Student ID:', studentId);
    console.log('📝 Course ID:', courseId);

    // Validate course exists
    const course = await Course.findById(courseId).populate('facultyId', 'name email');
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Course is not active'
      });
    }

    // Check if student already enrolled
    if (course.enrolledStudents.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

    // Check if request already exists
    const existingRequest = await CourseRequest.findOne({
      studentId,
      courseId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: existingRequest.status === 'pending' 
          ? 'You already have a pending request for this course'
          : 'You are already approved for this course'
      });
    }

    // Create new request
    const courseRequest = new CourseRequest({
      studentId,
      courseId,
      facultyId: course.facultyId._id,
      requestMessage: requestMessage || `Request to join ${course.title}`,
      status: 'pending'
    });

    await courseRequest.save();
    await courseRequest.populate('courseId', 'title code department semester');
    await courseRequest.populate('facultyId', 'name email');

    console.log('✅ Course request created successfully');
    console.log('✅ Request ID:', courseRequest._id);
    console.log('✅ Status:', courseRequest.status);
    console.log('📝 ========================================');

    res.status(201).json({
      success: true,
      message: 'Course join request sent successfully',
      data: courseRequest
    });

  } catch (error) {
    console.error('❌ Create course request error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active request for this course'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating course request'
    });
  }
};

// @desc    Get student's course requests
// @route   GET /api/course-requests/my-requests
// @access  Private (Student only)
const getMyRequests = async (req, res) => {
  try {
    const studentId = req.user.id;

    const requests = await CourseRequest.getStudentRequests(studentId);

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });

  } catch (error) {
    console.error('❌ Get my requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching requests'
    });
  }
};

// @desc    Get faculty's course requests
// @route   GET /api/course-requests/faculty-requests
// @access  Private (Faculty only)
const getFacultyRequests = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { status } = req.query;

    console.log('📚 ========================================');
    console.log('📚 FACULTY REQUESTING COURSE JOIN REQUESTS');
    console.log('📚 Faculty ID:', facultyId);
    console.log('📚 Status Filter:', status || 'all');

    const requests = await CourseRequest.getFacultyRequests(facultyId, status);

    console.log('📚 Total Requests Found:', requests.length);
    console.log('📚 ========================================');

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });

  } catch (error) {
    console.error('❌ Get faculty requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching requests'
    });
  }
};

// @desc    Get request statistics for faculty
// @route   GET /api/course-requests/stats
// @access  Private (Faculty only)
const getRequestStats = async (req, res) => {
  try {
    const facultyId = req.user.id;

    const stats = await CourseRequest.aggregate([
      { $match: { facultyId: new mongoose.Types.ObjectId(facultyId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Get request stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};

// @desc    Approve course request
// @route   PATCH /api/course-requests/:id/approve
// @access  Private (Faculty only)
const approveCourseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { responseMessage } = req.body;
    const facultyId = req.user.id;

    console.log('✅ ========================================');
    console.log('✅ FACULTY APPROVING COURSE REQUEST');
    console.log('✅ Request ID:', id);
    console.log('✅ Faculty ID:', facultyId);

    const request = await CourseRequest.findOne({ _id: id, facultyId })
      .populate('studentId', 'name email')
      .populate('courseId', 'title code');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    await request.approve(responseMessage);

    console.log('✅ Request approved successfully');
    console.log('✅ Student:', request.studentId.name);
    console.log('✅ Course:', request.courseId.title);
    console.log('✅ ========================================');

    res.status(200).json({
      success: true,
      message: 'Course request approved successfully',
      data: request
    });

  } catch (error) {
    console.error('❌ Approve request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while approving request'
    });
  }
};

// @desc    Reject course request
// @route   PATCH /api/course-requests/:id/reject
// @access  Private (Faculty only)
const rejectCourseRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { responseMessage } = req.body;
    const facultyId = req.user.id;

    console.log('❌ ========================================');
    console.log('❌ FACULTY REJECTING COURSE REQUEST');
    console.log('❌ Request ID:', id);
    console.log('❌ Faculty ID:', facultyId);

    const request = await CourseRequest.findOne({ _id: id, facultyId })
      .populate('studentId', 'name email')
      .populate('courseId', 'title code');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    await request.reject(responseMessage);

    console.log('❌ Request rejected');
    console.log('❌ Student:', request.studentId.name);
    console.log('❌ Course:', request.courseId.title);
    console.log('❌ ========================================');

    res.status(200).json({
      success: true,
      message: 'Course request rejected',
      data: request
    });

  } catch (error) {
    console.error('❌ Reject request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting request'
    });
  }
};

// @desc    Check request status for a course
// @route   GET /api/course-requests/status/:courseId
// @access  Private (Student only)
const getRequestStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const status = await CourseRequest.getRequestStatus(studentId, courseId);

    res.status(200).json({
      success: true,
      data: {
        courseId,
        status: status || 'none'
      }
    });

  } catch (error) {
    console.error('❌ Get request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking request status'
    });
  }
};

module.exports = {
  createCourseRequest,
  getMyRequests,
  getFacultyRequests,
  getRequestStats,
  approveCourseRequest,
  rejectCourseRequest,
  getRequestStatus
};
