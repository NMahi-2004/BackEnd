const Course = require('../models/Course');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// @desc    Create new course (Faculty only)
// @route   POST /api/courses
// @access  Private (Faculty only)
const createCourse = async (req, res) => {
  try {
    const { title, code, description, department, semester, credits } = req.body;
    const facultyId = req.user.id;

    // Validate required fields
    if (!title || !code || !department || !semester || !credits) {
      return res.status(400).json({
        success: false,
        message: 'Title, code, department, semester, and credits are required'
      });
    }

    // Get system settings for academic year
    const settings = await SystemSettings.findOne({ isActive: true });
    const academicYear = settings ? settings.academicYear : '2026-27';

    // Check if course code already exists
    const existingCourse = await Course.findOne({ code: code.toUpperCase() });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course code already exists'
      });
    }

    // Get faculty info for logging
    const faculty = await User.findById(facultyId);

    // Create course
    const courseData = {
      title: title.trim(),
      code: code.toUpperCase().trim(),
      description: description ? description.trim() : '',
      department: department.toUpperCase(),
      semester: parseInt(semester),
      credits: parseInt(credits),
      facultyId,
      academicYear
    };

    const course = new Course(courseData);
    await course.save();

    // Populate faculty info for response
    await course.populate('facultyId', 'name email department');

    console.log('✅ ========================================');
    console.log('✅ COURSE CREATED SUCCESSFULLY');
    console.log('✅ Course Code:', course.code);
    console.log('✅ Course Title:', course.title);
    console.log('✅ Faculty:', faculty.name);
    console.log('✅ Department:', course.department);
    console.log('✅ Semester:', course.semester);
    console.log('✅ Is Active:', course.isActive);
    console.log('✅ Course ID:', course._id);
    console.log('✅ ========================================');

    // Log course creation activity
    await logger.logCourseCreated(req.user, course, req);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });

  } catch (error) {
    console.error('Create course error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Course code already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating course'
    });
  }
};

// @desc    Get faculty's courses
// @route   GET /api/courses/my-courses
// @access  Private (Faculty only)
const getMyCourses = async (req, res) => {
  try {
    const facultyId = req.user.id;

    const courses = await Course.getFacultyCourses(facultyId);

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });

  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses'
    });
  }
};

// @desc    Get course by ID
// @route   GET /api/courses/:id
// @access  Private (Faculty only - own courses)
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.id;

    const course = await Course.findOne({ _id: id, facultyId })
      .populate('facultyId', 'name email department')
      .populate('enrolledStudents', 'name email department semester');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });

  } catch (error) {
    console.error('Get course by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course'
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Faculty only - own courses)
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.id;
    const { title, description, semester, credits, maxStudents } = req.body;

    const course = await Course.findOne({ _id: id, facultyId });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Update allowed fields (code and department cannot be changed)
    if (title) course.title = title.trim();
    if (description !== undefined) course.description = description.trim();
    if (semester) course.semester = parseInt(semester);
    if (credits) course.credits = parseInt(credits);
    if (maxStudents) course.maxStudents = parseInt(maxStudents);

    await course.save();
    await course.populate('facultyId', 'name email department');

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });

  } catch (error) {
    console.error('Update course error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating course'
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Faculty only - own courses)
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.id;

    const course = await Course.findOne({ _id: id, facultyId });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Soft delete - set isActive to false
    course.isActive = false;
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting course'
    });
  }
};

// @desc    Get courses for students (by department and semester)
// @route   GET /api/courses/available
// @access  Private (Student only)
const getAvailableCourses = async (req, res) => {
  try {
    console.log('📚 ========================================');
    console.log('📚 STUDENT REQUESTING COURSES');
    console.log('📚 Student ID:', req.user.id);
    console.log('📚 Student Name:', req.user.name);
    console.log('📚 Student Department:', req.user.department);
    console.log('📚 Student Semester:', req.user.semester);
    console.log('📚 Query Params:', req.query);
    
    const student = req.user;
    const { department, semester, showAll } = req.query;

    let courses;

    // If showAll is requested, return all active courses
    if (showAll === 'true') {
      console.log('📚 Fetching ALL active courses (showAll=true)');
      courses = await Course.find({ isActive: true })
        .populate('facultyId', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Use student's department and semester if not provided
      const searchDepartment = department || student.department;
      const searchSemester = semester || student.semester;

      if (searchDepartment && searchSemester) {
        console.log('📚 Searching with filters:', { searchDepartment, searchSemester });
        // Try to find courses matching department and semester
        courses = await Course.getCoursesByDepartmentSemester(
          searchDepartment, 
          parseInt(searchSemester)
        );
        
        console.log('📚 Filtered courses found:', courses.length);
        
        // If no courses found with filters, return all active courses
        if (courses.length === 0) {
          console.log('📚 No courses found for department/semester, returning all active courses');
          courses = await Course.find({ isActive: true })
            .populate('facultyId', 'name email')
            .sort({ createdAt: -1 });
        }
      } else {
        // If student doesn't have department/semester, return all active courses
        console.log('📚 Student missing department/semester, returning all active courses');
        courses = await Course.find({ isActive: true })
          .populate('facultyId', 'name email')
          .sort({ createdAt: -1 });
      }
    }

    console.log('📚 TOTAL COURSES RETURNED:', courses.length);
    if (courses.length > 0) {
      console.log('📚 Sample course:', {
        title: courses[0].title,
        code: courses[0].code,
        faculty: courses[0].facultyId?.name,
        isActive: courses[0].isActive
      });
    }
    console.log('📚 ========================================');

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });

  } catch (error) {
    console.error('❌ Get available courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available courses'
    });
  }
};

// @desc    Get course statistics for faculty
// @route   GET /api/courses/stats
// @access  Private (Faculty only)
const getCourseStats = async (req, res) => {
  try {
    const facultyId = req.user.id;

    const stats = await Course.aggregate([
      { $match: { facultyId: new mongoose.Types.ObjectId(facultyId), isActive: true } },
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          totalStudents: { $sum: { $size: '$enrolledStudents' } },
          avgCredits: { $avg: '$credits' },
          coursesBySemester: {
            $push: {
              semester: '$semester',
              title: '$title',
              enrolledCount: { $size: '$enrolledStudents' }
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalCourses: 0,
      totalStudents: 0,
      avgCredits: 0,
      coursesBySemester: []
    };

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course statistics'
    });
  }
};

// @desc    Get student's enrolled courses
// @route   GET /api/courses/enrolled
// @access  Private (Student only)
const getEnrolledCourses = async (req, res) => {
  try {
    const studentId = req.user.id;

    console.log('📚 ========================================');
    console.log('📚 FETCHING ENROLLED COURSES FOR STUDENT');
    console.log('📚 Student ID:', studentId);

    // Find all courses where student is enrolled
    const courses = await Course.find({
      enrolledStudents: studentId,
      isActive: true
    })
      .populate('facultyId', 'name email')
      .sort({ createdAt: -1 });

    console.log('📚 Total Enrolled Courses:', courses.length);
    if (courses.length > 0) {
      console.log('📚 Sample course:', {
        title: courses[0].title,
        code: courses[0].code,
        faculty: courses[0].facultyId?.name
      });
    }
    console.log('📚 ========================================');

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });

  } catch (error) {
    console.error('❌ Get enrolled courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching enrolled courses'
    });
  }
};

module.exports = {
  createCourse,
  getMyCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getAvailableCourses,
  getCourseStats,
  getEnrolledCourses
};