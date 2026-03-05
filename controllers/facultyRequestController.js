const FacultyRequest = require('../models/FacultyRequest');
const User = require('../models/User');

// @desc    Student requests to join faculty
// @route   POST /api/faculty-requests
// @access  Private (Student only)
const createFacultyRequest = async (req, res) => {
  try {
    const { facultyId, requestMessage } = req.body;
    const studentId = req.user.id;

    // Validate faculty exists and is actually faculty
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== 'faculty') {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Check if request already exists
    const existingRequest = await FacultyRequest.findOne({
      student: studentId,
      faculty: facultyId
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: `Request already exists with status: ${existingRequest.status}`
      });
    }

    // Create new request
    const request = new FacultyRequest({
      student: studentId,
      faculty: facultyId,
      requestMessage: requestMessage || ''
    });

    await request.save();

    // Populate the request with user details
    await request.populate([
      { path: 'student', select: 'name email department semester' },
      { path: 'faculty', select: 'name email department' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Faculty request sent successfully',
      data: request
    });

  } catch (error) {
    console.error('Create faculty request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating faculty request'
    });
  }
};

// @desc    Get student's faculty requests
// @route   GET /api/faculty-requests/my-requests
// @access  Private (Student only)
const getMyRequests = async (req, res) => {
  try {
    const studentId = req.user.id;

    const requests = await FacultyRequest.find({ student: studentId })
      .populate('faculty', 'name email department')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });

  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching requests'
    });
  }
};

// @desc    Get faculty's student requests
// @route   GET /api/faculty-requests/student-requests
// @access  Private (Faculty only)
const getStudentRequests = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { status } = req.query;

    let filter = { faculty: facultyId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const requests = await FacultyRequest.find(filter)
      .populate('student', 'name email department semester phoneNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });

  } catch (error) {
    console.error('Get student requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student requests'
    });
  }
};

// @desc    Approve faculty request
// @route   PUT /api/faculty-requests/:id/approve
// @access  Private (Faculty only)
const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { responseMessage } = req.body;
    const facultyId = req.user.id;

    const request = await FacultyRequest.findOne({
      _id: id,
      faculty: facultyId,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or already processed'
      });
    }

    request.status = 'approved';
    request.responseMessage = responseMessage || '';
    request.respondedAt = new Date();
    request.respondedBy = facultyId;

    await request.save();

    // Populate for response
    await request.populate('student', 'name email department semester');

    res.status(200).json({
      success: true,
      message: 'Request approved successfully',
      data: request
    });

  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while approving request'
    });
  }
};

// @desc    Reject faculty request
// @route   PUT /api/faculty-requests/:id/reject
// @access  Private (Faculty only)
const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { responseMessage } = req.body;
    const facultyId = req.user.id;

    const request = await FacultyRequest.findOne({
      _id: id,
      faculty: facultyId,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or already processed'
      });
    }

    request.status = 'rejected';
    request.responseMessage = responseMessage || '';
    request.respondedAt = new Date();
    request.respondedBy = facultyId;

    await request.save();

    // Populate for response
    await request.populate('student', 'name email department semester');

    res.status(200).json({
      success: true,
      message: 'Request rejected',
      data: request
    });

  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting request'
    });
  }
};

// @desc    Get available faculty for students
// @route   GET /api/faculty-requests/available-faculty
// @access  Private (Student only)
const getAvailableFaculty = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get all faculty members
    const faculty = await User.find({ 
      role: 'faculty', 
      isActive: true 
    }).select('name email department');

    // Get student's existing requests
    const existingRequests = await FacultyRequest.find({ 
      student: studentId 
    }).select('faculty status');

    // Create a map of faculty requests
    const requestMap = {};
    existingRequests.forEach(req => {
      requestMap[req.faculty.toString()] = req.status;
    });

    // Add request status to each faculty
    const facultyWithStatus = faculty.map(f => ({
      ...f.toObject(),
      requestStatus: requestMap[f._id.toString()] || null
    }));

    res.status(200).json({
      success: true,
      data: facultyWithStatus
    });

  } catch (error) {
    console.error('Get available faculty error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching faculty'
    });
  }
};

// @desc    Get faculty request statistics
// @route   GET /api/faculty-requests/stats
// @access  Private (Faculty only)
const getRequestStats = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const stats = await FacultyRequest.getRequestStats(facultyId);

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get request stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};

module.exports = {
  createFacultyRequest,
  getMyRequests,
  getStudentRequests,
  approveRequest,
  rejectRequest,
  getAvailableFaculty,
  getRequestStats
};