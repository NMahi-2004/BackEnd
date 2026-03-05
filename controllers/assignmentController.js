const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { validationResult } = require('express-validator');

// @desc    Create new assignment
// @route   POST /api/assignments
// @access  Private (Faculty only)
const createAssignment = async (req, res) => {
  try {
    console.log('📝 Creating assignment:', req.body);
    console.log('📎 File uploaded:', req.file);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      course,
      assignmentType,
      totalMarks,
      startDate,
      dueDate,
      allowLateSubmission,
      lateSubmissionDeadline
    } = req.body;

    console.log('✅ Validation passed, processing dates...');

    // Validate dates with better error handling
    const start = new Date(startDate);
    const due = new Date(dueDate);
    const now = new Date();

    // Allow start date to be in the near future (within 1 minute for testing)
    const oneMinuteFromNow = new Date(now.getTime() + 60000);
    
    if (start < oneMinuteFromNow) {
      console.log('❌ Start date validation failed');
      return res.status(400).json({
        success: false,
        message: 'Start date must be at least 1 minute in the future'
      });
    }

    if (due <= start) {
      console.log('❌ Due date validation failed');
      return res.status(400).json({
        success: false,
        message: 'Due date must be after start date'
      });
    }

    const assignmentData = {
      title,
      description,
      course,
      assignmentType,
      totalMarks,
      startDate: start,
      dueDate: due,
      allowLateSubmission: allowLateSubmission || false,
      createdBy: req.user.id,
      isPublished: true,
      publishedAt: new Date()
    };

    // Add file attachment if uploaded
    if (req.file) {
      console.log('📎 Adding file attachment to assignment');
      assignmentData.attachmentFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date()
      };
    }

    if (allowLateSubmission && lateSubmissionDeadline) {
      const lateDeadline = new Date(lateSubmissionDeadline);
      if (lateDeadline <= due) {
        console.log('❌ Late submission deadline validation failed');
        return res.status(400).json({
          success: false,
          message: 'Late submission deadline must be after due date'
        });
      }
      assignmentData.lateSubmissionDeadline = lateDeadline;
    }

    console.log('💾 Creating assignment in database...');
    const assignment = new Assignment(assignmentData);
    await assignment.save();
    
    console.log('✅ Assignment created successfully:', assignment._id);

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: { assignment }
    });
  } catch (error) {
    console.error('❌ Create assignment error:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Database validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating assignment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all assignments for faculty
// @route   GET /api/assignments/faculty
// @access  Private (Faculty only)
const getFacultyAssignments = async (req, res) => {
  console.log('📚 Fetching faculty assignments...');
  console.log('👤 Faculty ID:', req.user.id);
  console.log('👤 Faculty username:', req.user.username);
  
  try {
    const assignments = await Assignment.find({ createdBy: req.user.id })
      .populate('course', 'code title')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${assignments.length} assignments for faculty ${req.user.username}`);
    
    if (assignments.length > 0) {
      console.log('📋 Assignment titles:', assignments.map(a => a.title));
      console.log('📋 Course codes:', assignments.map(a => a.course?.code || 'N/A'));
    }
    
    // Update status for each assignment based on current time
    const updatedAssignments = assignments.map(assignment => {
      const assignmentObj = assignment.toObject();
      assignmentObj.currentStatus = assignment.currentStatus;
      assignmentObj.submissionsAllowed = assignment.submissionsAllowed;
      
      // Add course code for display
      if (assignment.course) {
        assignmentObj.courseCode = assignment.course.code;
        assignmentObj.courseTitle = assignment.course.title;
      }
      
      return assignmentObj;
    });

    res.status(200).json({
      success: true,
      data: { assignments: updatedAssignments }
    });
  } catch (error) {
    console.error('❌ Get faculty assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignments'
    });
  }
};

// @desc    Get assignments for students
// @route   GET /api/assignments/student
// @access  Private (Student only)
const getStudentAssignments = async (req, res) => {
  try {
    console.log('📚 ========================================');
    console.log('📚 FETCHING STUDENT ASSIGNMENTS');
    console.log('📚 Student ID:', req.user.id);
    console.log('📚 Query params:', req.query);
    
    const { course } = req.query;
    
    let assignments;
    
    if (course) {
      console.log('📚 Fetching assignments for course:', course);
      // Get assignments for specific course
      assignments = await Assignment.find({
        course: course,
        isPublished: true
      })
      .populate('createdBy', 'name')
      .sort({ dueDate: 1 });
    } else {
      console.log('📚 Fetching all published assignments');
      // Get all published assignments
      assignments = await Assignment.find({
        isPublished: true
      })
      .populate('createdBy', 'name')
      .sort({ dueDate: 1 });
    }
    
    console.log('📚 Total assignments found:', assignments.length);
    if (assignments.length > 0) {
      console.log('📚 Sample assignment:', {
        title: assignments[0].title,
        course: assignments[0].course,
        isPublished: assignments[0].isPublished,
        dueDate: assignments[0].dueDate
      });
    }
    
    // Get student's submissions for these assignments
    const assignmentIds = assignments.map(a => a._id);
    const submissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds },
      student: req.user.id
    });

    console.log('📚 Total submissions found:', submissions.length);

    // Create a map of submissions by assignment ID
    const submissionMap = {};
    submissions.forEach(sub => {
      submissionMap[sub.assignment.toString()] = sub;
    });

    // Add submission status to each assignment
    const assignmentsWithStatus = assignments.map(assignment => {
      const assignmentObj = assignment.toObject();
      const submission = submissionMap[assignment._id.toString()];
      
      assignmentObj.currentStatus = assignment.currentStatus;
      assignmentObj.submissionsAllowed = assignment.submissionsAllowed;
      assignmentObj.visibleToStudents = assignment.visibleToStudents;
      assignmentObj.hasSubmission = !!submission;
      assignmentObj.submissionStatus = submission ? submission.status : null;
      assignmentObj.submittedAt = submission ? submission.submittedAt : null;
      assignmentObj.isLateSubmission = submission ? submission.isLateSubmission : false;
      
      return assignmentObj;
    });

    console.log('📚 Returning', assignmentsWithStatus.length, 'assignments to student');
    console.log('📚 ========================================');

    res.status(200).json({
      success: true,
      data: assignmentsWithStatus
    });
  } catch (error) {
    console.error('❌ Get student assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignments'
    });
  }
};

// @desc    Get assignment by ID
// @route   GET /api/assignments/:id
// @access  Private
const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('course', 'title code department semester');
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check access permissions
    const isFaculty = req.user.role === 'faculty';
    const isCreator = assignment.createdBy._id.toString() === req.user.id;
    const isStudent = req.user.role === 'student';

    if (isFaculty && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own assignments.'
      });
    }

    if (isStudent && (!assignment.visibleToStudents)) {
      return res.status(403).json({
        success: false,
        message: 'Assignment is not available yet'
      });
    }

    const assignmentObj = assignment.toObject();
    assignmentObj.currentStatus = assignment.currentStatus;
    assignmentObj.submissionsAllowed = assignment.submissionsAllowed;
    assignmentObj.visibleToStudents = assignment.visibleToStudents;

    // If student, get their submission
    if (isStudent) {
      const submission = await AssignmentSubmission.findOne({
        assignment: assignment._id,
        student: req.user.id
      });
      
      assignmentObj.hasSubmission = !!submission;
      assignmentObj.submission = submission;
    }

    res.status(200).json({
      success: true,
      data: assignmentObj
    });
  } catch (error) {
    console.error('Get assignment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignment'
    });
  }
};

// @desc    Add questions to assignment
// @route   POST /api/assignments/:id/questions
// @access  Private (Faculty only)
const addQuestions = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (assignment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own assignments.'
      });
    }

    if (!assignment.isEditable()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify published assignment'
      });
    }

    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions array is required'
      });
    }

    // Validate and add questions
    const validatedQuestions = questions.map((q, index) => ({
      questionText: q.questionText,
      questionType: q.questionType,
      marks: q.marks,
      order: index + 1
    }));

    assignment.questions = validatedQuestions;
    
    // Recalculate total marks
    const calculatedTotal = validatedQuestions.reduce((sum, q) => sum + q.marks, 0);
    assignment.totalMarks = calculatedTotal;
    
    await assignment.save();

    res.status(200).json({
      success: true,
      message: 'Questions added successfully',
      data: { assignment }
    });
  } catch (error) {
    console.error('Add questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding questions'
    });
  }
};

// @desc    Publish assignment
// @route   PUT /api/assignments/:id/publish
// @access  Private (Faculty only)
const publishAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (assignment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only publish your own assignments.'
      });
    }

    if (!assignment.canPublish()) {
      return res.status(400).json({
        success: false,
        message: 'Assignment cannot be published. Ensure it has questions and is in draft status.'
      });
    }

    assignment.isPublished = true;
    assignment.publishedAt = new Date();
    await assignment.save();

    res.status(200).json({
      success: true,
      message: 'Assignment published successfully',
      data: { assignment }
    });
  } catch (error) {
    console.error('Publish assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while publishing assignment'
    });
  }
};

// @desc    Get assignment submissions
// @route   GET /api/assignments/:id/submissions
// @access  Private (Faculty only)
const getAssignmentSubmissions = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (assignment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view submissions for your own assignments.'
      });
    }

    const submissions = await AssignmentSubmission.findByAssignment(req.params.id);

    res.status(200).json({
      success: true,
      data: { submissions }
    });
  } catch (error) {
    console.error('Get assignment submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submissions'
    });
  }
};

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
// @access  Private (Student only)
const submitAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (!assignment.submissionsAllowed) {
      return res.status(400).json({
        success: false,
        message: 'Submissions are not allowed for this assignment at this time'
      });
    }

    // Handle both types of submissions:
    // 1. Question-based (answers array)
    // 2. Content-based (text content and/or file upload)
    const { answers, content } = req.body;
    const file = req.file;
    
    // Validate that at least one submission type is provided
    if (!answers && !content && !file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide answers, content, or upload a file'
      });
    }

    // Check if student already has a submission
    let submission = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: req.user.id
    });

    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const isLate = now > dueDate;

    if (submission) {
      // Update existing submission
      if (answers) submission.answers = answers;
      if (content) submission.content = content;
      if (file) {
        submission.file = {
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size
        };
      }
      submission.isLateSubmission = isLate;
      submission.status = 'submitted';
      submission.submittedAt = now;
    } else {
      // Create new submission
      const submissionData = {
        assignment: assignment._id,
        student: req.user.id,
        isLateSubmission: isLate,
        status: 'submitted',
        submittedAt: now,
        totalMarks: assignment.totalMarks
      };

      if (answers) submissionData.answers = answers;
      if (content) submissionData.content = content;
      if (file) {
        submissionData.file = {
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size
        };
      }

      submission = new AssignmentSubmission(submissionData);
    }

    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Assignment submitted successfully',
      data: { submission }
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting assignment'
    });
  }
};

// @desc    Evaluate submission
// @route   PUT /api/assignments/submissions/:submissionId/evaluate
// @access  Private (Faculty only)
const evaluateSubmission = async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.submissionId)
      .populate('assignment')
      .populate('student', 'fullName email');
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    if (submission.assignment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only evaluate submissions for your own assignments.'
      });
    }

    const { answers, generalFeedback } = req.body;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Answers with marks are required'
      });
    }

    // Update answers with marks and feedback
    submission.answers = answers;
    submission.generalFeedback = generalFeedback;
    submission.status = 'evaluated';
    submission.evaluatedBy = req.user.id;
    submission.evaluatedAt = new Date();

    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Submission evaluated successfully',
      data: { submission }
    });
  } catch (error) {
    console.error('Evaluate submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while evaluating submission'
    });
  }
};

// @desc    Publish results
// @route   PUT /api/assignments/:id/publish-results
// @access  Private (Faculty only)
const publishResults = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (assignment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only publish results for your own assignments.'
      });
    }

    assignment.resultsPublished = true;
    assignment.resultsPublishedAt = new Date();
    await assignment.save();

    res.status(200).json({
      success: true,
      message: 'Results published successfully',
      data: { assignment }
    });
  } catch (error) {
    console.error('Publish results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while publishing results'
    });
  }
};

// @desc    Get student's own submissions
// @route   GET /api/assignments/my-submissions
// @access  Private (Student only)
const getMySubmissions = async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.findByStudent(req.user.id);

    // Filter to only show results if they are published
    const filteredSubmissions = submissions.map(submission => {
      const submissionObj = submission.toObject();
      
      // Only show marks and feedback if results are published
      if (!submission.assignment.resultsPublished) {
        delete submissionObj.obtainedMarks;
        delete submissionObj.percentage;
        delete submissionObj.grade;
        delete submissionObj.generalFeedback;
        submissionObj.answers = submissionObj.answers.map(answer => {
          const answerObj = { ...answer };
          delete answerObj.marks;
          delete answerObj.feedback;
          return answerObj;
        });
      }
      
      return submissionObj;
    });

    res.status(200).json({
      success: true,
      data: { submissions: filteredSubmissions }
    });
  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submissions'
    });
  }
};

// @desc    Get assignments for a specific course
// @route   GET /api/courses/:courseId/assignments
// @access  Private (Faculty and enrolled students)
const getCourseAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('📚 ========================================');
    console.log('📚 FETCHING COURSE ASSIGNMENTS');
    console.log('📚 Course ID:', courseId);
    console.log('📚 User ID:', userId);
    console.log('📚 User Role:', userRole);

    // Verify course exists and user has access
    const Course = require('../models/Course');
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check access permissions
    if (userRole === 'faculty') {
      if (course.facultyId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view these assignments'
        });
      }
    } else if (userRole === 'student') {
      if (!course.enrolledStudents.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to view assignments'
        });
      }
    }

    // Fetch assignments for this course
    const assignments = await Assignment.find({ course: courseId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('📚 Total Assignments Found:', assignments.length);
    console.log('📚 ========================================');

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });

  } catch (error) {
    console.error('❌ Get course assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignments'
    });
  }
};

module.exports = {
  createAssignment,
  getFacultyAssignments,
  getStudentAssignments,
  getAssignmentById,
  addQuestions,
  publishAssignment,
  getAssignmentSubmissions,
  submitAssignment,
  evaluateSubmission,
  publishResults,
  getMySubmissions,
  getCourseAssignments
};