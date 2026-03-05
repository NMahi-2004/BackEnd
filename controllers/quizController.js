const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const { validationResult } = require('express-validator');

// @desc    Create new quiz (Faculty only)
// @route   POST /api/quizzes
// @access  Private (Faculty)
const createQuiz = async (req, res) => {
  console.log('📝 ========================================');
  console.log('📝 CREATE QUIZ - START');
  console.log('📝 User:', req.user.username, 'Role:', req.user.role);
  console.log('📝 ========================================');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    console.log('📝 Quiz Title:', req.body.title);
    console.log('📝 Course:', req.body.course);
    console.log('📝 Subject:', req.body.subject);
    console.log('📝 Questions received:', req.body.questions?.length || 0);
    
    if (req.body.questions && req.body.questions.length > 0) {
      console.log('📝 First question sample:');
      console.log('   Text:', req.body.questions[0].questionText);
      console.log('   Options:', req.body.questions[0].options?.length || 0);
      console.log('   Points:', req.body.questions[0].points);
    } else {
      console.error('❌ NO QUESTIONS IN REQUEST BODY!');
      return res.status(400).json({
        success: false,
        message: 'Quiz must have at least one question'
      });
    }

    const quizData = {
      ...req.body,
      createdBy: req.user.id
    };

    console.log('✅ Creating quiz document...');
    const quiz = new Quiz(quizData);
    
    console.log('📝 Quiz document before save:');
    console.log('   Title:', quiz.title);
    console.log('   Questions:', quiz.questions?.length || 0);
    console.log('   Course:', quiz.course);
    
    if (quiz.questions && quiz.questions.length > 0) {
      console.log('📝 Questions details:');
      quiz.questions.forEach((q, i) => {
        console.log(`   Q${i + 1}: ${q.questionText}`);
        console.log(`       Options: ${q.options?.length || 0}`);
      });
    }
    
    await quiz.save();
    
    console.log('✅ ========================================');
    console.log('✅ Quiz saved successfully!');
    console.log('✅ Quiz ID:', quiz._id);
    console.log('✅ Questions saved:', quiz.questions.length);
    console.log('✅ Total marks:', quiz.totalMarks);
    
    // VERIFY: Read back from database to confirm
    const savedQuiz = await Quiz.findById(quiz._id);
    console.log('✅ VERIFICATION - Questions in DB:', savedQuiz.questions.length);
    if (savedQuiz.questions.length > 0) {
      console.log('✅ First question in DB:', savedQuiz.questions[0].questionText);
    }
    console.log('✅ ========================================');

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          subject: quiz.subject,
          course: quiz.course,
          duration: quiz.duration,
          totalMarks: quiz.totalMarks,
          questionsCount: quiz.questions.length,
          isActive: quiz.isActive,
          createdAt: quiz.createdAt
        }
      }
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ CREATE QUIZ ERROR');
    console.error('❌ Error:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ ========================================');
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Quiz validation failed',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during quiz creation',
      error: error.message
    });
  }
};

// @desc    Get all quizzes with filtering
// @route   GET /api/quizzes
// @access  Private
const getQuizzes = async (req, res) => {
  console.log('📚 Fetching quizzes...');
  console.log('User:', req.user.username, 'ID:', req.user.id, 'Role:', req.user.role);
  console.log('Query params:', req.query);
  
  try {
    const { subject, isActive, page = 1, limit = 10 } = req.query;
    const userRole = req.user.role;
    
    // Build filter object
    const filter = {};
    if (subject && subject.trim()) filter.subject = new RegExp(subject, 'i');
    // Only apply isActive filter if explicitly set to 'true' or 'false'
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;
    
    // Faculty can only see their own quizzes
    if (userRole === 'faculty') {
      filter.createdBy = req.user.id;
      console.log('📋 Faculty filter - createdBy:', req.user.id);
    }
    
    // Students can only see active quizzes from their enrolled courses
    if (userRole === 'student') {
      console.log('📚 Fetching student enrolled courses...');
      
      // Get courses where student is enrolled
      const Course = require('../models/Course');
      const enrolledCourses = await Course.find({
        enrolledStudents: req.user.id,
        isActive: true
      }).select('_id');
      
      const enrolledCourseIds = enrolledCourses.map(course => course._id);
      console.log('📚 Student enrolled in', enrolledCourseIds.length, 'courses');
      console.log('📚 Course IDs:', enrolledCourseIds);
      
      if (enrolledCourseIds.length === 0) {
        console.log('⚠️ Student not enrolled in any courses');
        return res.status(200).json({
          success: true,
          data: {
            quizzes: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalQuizzes: 0,
              hasNext: false,
              hasPrev: false
            }
          },
          message: 'You are not enrolled in any courses yet'
        });
      }
      
      // CRITICAL: Only show quizzes that have a course field AND it's in enrolled courses
      filter.isActive = true;
      filter.course = { $in: enrolledCourseIds, $exists: true, $ne: null };
      
      const now = new Date();
      filter.startDate = { $lte: now };
      filter.$or = [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ];
      
      console.log('🔍 Student quiz filter applied - only showing quizzes from enrolled courses');
    }

    console.log('🔍 Query filter:', JSON.stringify(filter));

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get quizzes with pagination - using distinct to prevent duplicates
    const quizzes = await Quiz.find(filter)
      .populate('createdBy', 'firstName lastName username name')
      .populate('course', 'code title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`✅ Found ${quizzes.length} quizzes for ${userRole}`);
    
    if (userRole === 'student' && quizzes.length > 0) {
      console.log('📋 Quiz details:');
      quizzes.forEach((quiz, index) => {
        console.log(`  ${index + 1}. ${quiz.title} - Course: ${quiz.course?.code || 'NO COURSE'} - Faculty: ${quiz.createdBy?.name || quiz.createdBy?.username}`);
      });
    }

    // Get total count for pagination
    const total = await Quiz.countDocuments(filter);
    console.log(`📊 Total quizzes matching filter: ${total}`);

    // For students, add attempt information
    let quizzesWithAttempts = quizzes;
    if (userRole === 'student') {
      quizzesWithAttempts = await Promise.all(
        quizzes.map(async (quiz) => {
          const attemptCount = await QuizAttempt.getAttemptCount(quiz._id, req.user.id);
          const bestScore = await QuizAttempt.getBestScore(quiz._id, req.user.id);
          
          return {
            ...quiz.toObject(),
            attemptCount,
            bestScore: bestScore ? bestScore.score : null,
            bestPercentage: bestScore ? bestScore.percentage : null,
            canAttempt: attemptCount < quiz.allowedAttempts
          };
        })
      );
    }

    res.status(200).json({
      success: true,
      data: {
        quizzes: quizzesWithAttempts.map(quiz => ({
          id: quiz._id || quiz.id,
          title: quiz.title,
          description: quiz.description,
          subject: quiz.subject,
          course: quiz.course,
          duration: quiz.duration,
          totalMarks: quiz.totalMarks,
          questionsCount: quiz.questions ? quiz.questions.length : 0,
          isActive: quiz.isActive,
          startDate: quiz.startDate,
          endDate: quiz.endDate,
          allowedAttempts: quiz.allowedAttempts,
          createdBy: quiz.createdBy,
          createdAt: quiz.createdAt,
          ...(userRole === 'student' && {
            attemptCount: quiz.attemptCount,
            bestScore: quiz.bestScore,
            bestPercentage: quiz.bestPercentage,
            canAttempt: quiz.canAttempt
          })
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalQuizzes: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quizzes'
    });
  }
};

// @desc    Get quiz by ID
// @route   GET /api/quizzes/:id
// @access  Private
const getQuizById = async (req, res) => {
  console.log('🔍 ========================================');
  console.log('🔍 GET QUIZ BY ID - START');
  console.log('🔍 Quiz ID from params:', req.params.id);
  console.log('🔍 User:', req.user.username);
  console.log('🔍 User ID:', req.user.id);
  console.log('🔍 User Role:', req.user.role);
  console.log('🔍 ========================================');
  
  try {
    const quizId = req.params.id;
    
    // Validate quiz ID format
    if (!quizId || quizId === 'undefined' || quizId === 'null') {
      console.error('❌ Invalid quiz ID:', quizId);
      return res.status(400).json({
        success: false,
        message: 'Invalid quiz ID provided'
      });
    }
    
    console.log('📡 Fetching quiz from database...');
    const quiz = await Quiz.findById(quizId)
      .populate('createdBy', 'firstName lastName username name')
      .populate('course', 'code title enrolledStudents');

    if (!quiz) {
      console.error('❌ Quiz not found in database');
      console.error('❌ Searched for ID:', quizId);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    console.log('✅ Quiz found:', quiz.title);
    console.log('📝 Quiz has', quiz.questions?.length || 0, 'questions');
    console.log('📚 Course:', quiz.course?.code || 'No course');
    console.log('👨‍🏫 Faculty:', quiz.createdBy?.name || quiz.createdBy?.username || 'Unknown');

    // Check permissions
    const userRole = req.user.role;
    
    if (userRole === 'faculty' && quiz.createdBy._id.toString() !== req.user.id) {
      console.log('❌ Faculty access denied - not quiz creator');
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own quizzes.'
      });
    }

    // For students, check if quiz is active and available
    if (userRole === 'student') {
      console.log('🔍 Checking student access...');
      
      // Check if student is enrolled in the course
      if (quiz.course) {
        const isEnrolled = quiz.course.enrolledStudents.some(
          studentId => studentId.toString() === req.user.id
        );
        
        console.log('📚 Course ID:', quiz.course._id);
        console.log('👨‍🎓 Student enrolled:', isEnrolled);
        
        if (!isEnrolled) {
          console.log('❌ Student not enrolled in course');
          return res.status(403).json({
            success: false,
            message: 'You must be enrolled in this course to access this quiz'
          });
        }
      } else {
        console.warn('⚠️ Quiz has no course assigned');
      }
      
      if (!quiz.isActive) {
        console.log('❌ Quiz is not active');
        return res.status(403).json({
          success: false,
          message: 'This quiz is not currently available'
        });
      }

      const now = new Date();
      if (quiz.startDate && quiz.startDate > now) {
        console.log('❌ Quiz has not started yet');
        return res.status(403).json({
          success: false,
          message: 'This quiz has not started yet'
        });
      }

      if (quiz.endDate && quiz.endDate < now) {
        console.log('❌ Quiz has ended');
        return res.status(403).json({
          success: false,
          message: 'This quiz has ended'
        });
      }
      
      console.log('✅ Student access granted');
    }

    // Prepare response based on user role
    let quizData = {
      id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      subject: quiz.subject,
      course: quiz.course ? {
        id: quiz.course._id,
        code: quiz.course.code,
        title: quiz.course.title
      } : null,
      duration: quiz.duration,
      totalMarks: quiz.totalMarks,
      questionsCount: quiz.questions.length,
      isActive: quiz.isActive,
      startDate: quiz.startDate,
      endDate: quiz.endDate,
      allowedAttempts: quiz.allowedAttempts,
      showResults: quiz.showResults,
      shuffleQuestions: quiz.shuffleQuestions,
      shuffleOptions: quiz.shuffleOptions,
      createdBy: {
        id: quiz.createdBy._id,
        name: quiz.createdBy.name || quiz.createdBy.firstName || quiz.createdBy.username,
        username: quiz.createdBy.username
      },
      createdAt: quiz.createdAt
    };

    // Include questions for faculty and admin
    if (userRole === 'faculty' || userRole === 'admin') {
      console.log('📝 Including questions with correct answers (faculty/admin)');
      quizData.questions = quiz.questions;
    }

    // For students attempting quiz, include questions without correct answers
    if (userRole === 'student') {
      console.log('📝 Preparing quiz for student...');
      console.log('   Quiz has', quiz.questions.length, 'questions in DB');
      
      const QuizAttempt = require('../models/QuizAttempt');
      
      try {
        const attemptCount = await QuizAttempt.getAttemptCount(quiz._id, req.user.id);
        const bestScore = await QuizAttempt.getBestScore(quiz._id, req.user.id);
        
        console.log('📊 Student attempts:', attemptCount, '/', quiz.allowedAttempts);
        
        quizData.attemptCount = attemptCount;
        quizData.bestScore = bestScore ? bestScore.score : null;
        quizData.bestPercentage = bestScore ? bestScore.percentage : null;
        quizData.bestAttemptId = bestScore ? bestScore._id : null;
        quizData.canAttempt = attemptCount < quiz.allowedAttempts;
      } catch (attemptError) {
        console.error('⚠️  Error getting attempt info:', attemptError.message);
        // Set defaults if attempt check fails
        quizData.attemptCount = 0;
        quizData.bestScore = null;
        quizData.bestPercentage = null;
        quizData.bestAttemptId = null;
        quizData.canAttempt = true;
      }
      
      // Include questions but hide correct answers
      console.log('📝 Including questions WITHOUT correct answers (student)');
      console.log('   Mapping', quiz.questions.length, 'questions...');
      
      quizData.questions = quiz.questions.map((q, index) => ({
        id: q._id,
        questionNumber: index + 1,
        questionText: q.questionText,
        options: q.options.map(opt => ({
          text: opt.text
          // Don't include isCorrect
        })),
        points: q.points
        // Don't include explanation or correctAnswer
      }));
      
      console.log('✅ Questions mapped:', quizData.questions.length);
      console.log('📝 Prepared', quizData.questions.length, 'questions for student');
    }

    console.log('✅ ========================================');
    console.log('✅ Quiz fetched successfully');
    console.log('✅ Returning quiz with', quizData.questions?.length || 0, 'questions');
    console.log('✅ ========================================');
    
    res.status(200).json({
      success: true,
      data: { quiz: quizData }
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ GET QUIZ BY ID ERROR');
    console.error('❌ Error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ ========================================');
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quiz',
      error: error.message
    });
  }
};

// @desc    Update quiz (Faculty only - own quizzes)
// @route   PUT /api/quizzes/:id
// @access  Private (Faculty)
const updateQuiz = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check if user owns this quiz
    if (quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own quizzes.'
      });
    }

    // Check if quiz has attempts
    const attemptCount = await QuizAttempt.countDocuments({ quiz: quiz._id });
    if (attemptCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update quiz that has already been attempted by students'
      });
    }

    // Update quiz
    Object.assign(quiz, req.body);
    await quiz.save();

    res.status(200).json({
      success: true,
      message: 'Quiz updated successfully',
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          subject: quiz.subject,
          duration: quiz.duration,
          totalMarks: quiz.totalMarks,
          questionsCount: quiz.questions.length,
          isActive: quiz.isActive,
          updatedAt: quiz.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during quiz update'
    });
  }
};

// @desc    Delete quiz (Faculty only - own quizzes)
// @route   DELETE /api/quizzes/:id
// @access  Private (Faculty)
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check if user owns this quiz
    if (quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own quizzes.'
      });
    }

    // Check if quiz has attempts
    const attemptCount = await QuizAttempt.countDocuments({ quiz: quiz._id });
    if (attemptCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete quiz that has been attempted by students. Consider deactivating it instead.'
      });
    }

    await Quiz.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during quiz deletion'
    });
  }
};

// @desc    Get quiz statistics (Faculty - own quizzes, Admin - all)
// @route   GET /api/quizzes/:id/statistics
// @access  Private (Faculty, Admin)
const getQuizStatistics = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check permissions
    if (req.user.role === 'faculty' && quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view statistics for your own quizzes.'
      });
    }

    const statistics = await quiz.getStatistics();

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          subject: quiz.subject
        },
        statistics
      }
    });
  } catch (error) {
    console.error('Get quiz statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quiz statistics'
    });
  }
};

module.exports = {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getQuizStatistics
};