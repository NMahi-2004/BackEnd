const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const { validationResult } = require('express-validator');

// @desc    Start quiz attempt (Student only)
// @route   POST /api/quiz-attempts/:quizId/start
// @access  Private (Student)
const startQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const studentId = req.user.id;

    // Get quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check if quiz is active and available
    if (!quiz.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This quiz is not currently available'
      });
    }

    const now = new Date();
    if (quiz.startDate > now) {
      return res.status(400).json({
        success: false,
        message: 'This quiz has not started yet'
      });
    }

    if (quiz.endDate && quiz.endDate < now) {
      return res.status(400).json({
        success: false,
        message: 'This quiz has ended'
      });
    }

    // Check if student has remaining attempts
    const attemptCount = await QuizAttempt.getAttemptCount(quizId, studentId);
    if (attemptCount >= quiz.allowedAttempts) {
      return res.status(400).json({
        success: false,
        message: `You have already used all ${quiz.allowedAttempts} attempts for this quiz`
      });
    }

    // Check if student has an active attempt
    const activeAttempt = await QuizAttempt.findOne({
      quiz: quizId,
      student: studentId,
      status: 'in-progress'
    });

    if (activeAttempt) {
      // Check if the active attempt is expired
      if (activeAttempt.isExpired(quiz.duration)) {
        activeAttempt.status = 'time-expired';
        activeAttempt.endTime = new Date();
        await activeAttempt.save();
      } else {
        // Return the existing active attempt
        const remainingTime = activeAttempt.getRemainingTime(quiz.duration);
        
        return res.status(200).json({
          success: true,
          message: 'Resuming existing quiz attempt',
          data: {
            attempt: {
              id: activeAttempt._id,
              attemptNumber: activeAttempt.attemptNumber,
              startTime: activeAttempt.startTime,
              remainingTime,
              status: activeAttempt.status
            },
            quiz: {
              id: quiz._id,
              title: quiz.title,
              duration: quiz.duration,
              totalMarks: quiz.totalMarks,
              questionsCount: quiz.questions.length,
              shuffleQuestions: quiz.shuffleQuestions,
              shuffleOptions: quiz.shuffleOptions
            }
          }
        });
      }
    }

    // Create new attempt
    const newAttempt = new QuizAttempt({
      quiz: quizId,
      student: studentId,
      attemptNumber: attemptCount + 1,
      totalQuestions: quiz.questions.length,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await newAttempt.save();

    const remainingTime = newAttempt.getRemainingTime(quiz.duration);

    res.status(201).json({
      success: true,
      message: 'Quiz attempt started successfully',
      data: {
        attempt: {
          id: newAttempt._id,
          attemptNumber: newAttempt.attemptNumber,
          startTime: newAttempt.startTime,
          remainingTime,
          status: newAttempt.status
        },
        quiz: {
          id: quiz._id,
          title: quiz.title,
          duration: quiz.duration,
          totalMarks: quiz.totalMarks,
          questionsCount: quiz.questions.length,
          shuffleQuestions: quiz.shuffleQuestions,
          shuffleOptions: quiz.shuffleOptions
        }
      }
    });
  } catch (error) {
    console.error('Start quiz attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while starting quiz attempt'
    });
  }
};

// @desc    Get quiz questions for attempt (Student only)
// @route   GET /api/quiz-attempts/:attemptId/questions
// @access  Private (Student)
const getQuizQuestions = async (req, res) => {
  try {
    const { attemptId } = req.params;

    // Get attempt
    const attempt = await QuizAttempt.findById(attemptId)
      .populate('quiz')
      .populate('student', 'firstName lastName username');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    // Check if user owns this attempt
    if (attempt.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own quiz attempts.'
      });
    }

    // Check if attempt is still active
    if (attempt.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'This quiz attempt is no longer active'
      });
    }

    // Check if attempt is expired
    if (attempt.isExpired(attempt.quiz.duration)) {
      attempt.status = 'time-expired';
      attempt.endTime = new Date();
      await attempt.save();

      return res.status(400).json({
        success: false,
        message: 'Quiz time has expired'
      });
    }

    // Prepare questions (without correct answers)
    let questions = attempt.quiz.questions.map((question, index) => {
      let options = question.options.map(option => ({
        text: option.text
      }));

      // Shuffle options if enabled
      if (attempt.quiz.shuffleOptions) {
        options = options.sort(() => Math.random() - 0.5);
      }

      return {
        id: question._id,
        questionNumber: index + 1,
        questionText: question.questionText,
        options,
        points: question.points
      };
    });

    // Shuffle questions if enabled
    if (attempt.quiz.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
      // Update question numbers after shuffling
      questions = questions.map((question, index) => ({
        ...question,
        questionNumber: index + 1
      }));
    }

    const remainingTime = attempt.getRemainingTime(attempt.quiz.duration);

    res.status(200).json({
      success: true,
      data: {
        attempt: {
          id: attempt._id,
          attemptNumber: attempt.attemptNumber,
          startTime: attempt.startTime,
          remainingTime,
          status: attempt.status
        },
        quiz: {
          id: attempt.quiz._id,
          title: attempt.quiz.title,
          description: attempt.quiz.description,
          duration: attempt.quiz.duration,
          totalMarks: attempt.quiz.totalMarks,
          questionsCount: questions.length
        },
        questions
      }
    });
  } catch (error) {
    console.error('Get quiz questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quiz questions'
    });
  }
};

// @desc    Submit quiz answer (Student only)
// @route   POST /api/quiz-attempts/:attemptId/answer
// @access  Private (Student)
const submitAnswer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { attemptId } = req.params;
    const { questionId, selectedOptionIndex, timeSpent } = req.body;

    // Get attempt
    const attempt = await QuizAttempt.findById(attemptId).populate('quiz');
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    // Check if user owns this attempt
    if (attempt.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if attempt is still active
    if (attempt.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'This quiz attempt is no longer active'
      });
    }

    // Check if attempt is expired
    if (attempt.isExpired(attempt.quiz.duration)) {
      attempt.status = 'time-expired';
      attempt.endTime = new Date();
      await attempt.save();

      return res.status(400).json({
        success: false,
        message: 'Quiz time has expired'
      });
    }

    // Find the question
    const question = attempt.quiz.questions.id(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Validate selected option index
    if (selectedOptionIndex < 0 || selectedOptionIndex >= question.options.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option selected'
      });
    }

    // Check if answer is correct
    const selectedOption = question.options[selectedOptionIndex];
    const isCorrect = selectedOption.isCorrect;
    const points = isCorrect ? question.points : 0;

    // Remove existing answer for this question if any
    attempt.answers = attempt.answers.filter(
      answer => answer.questionId.toString() !== questionId
    );

    // Add new answer
    attempt.answers.push({
      questionId,
      selectedOptionIndex,
      isCorrect,
      points,
      timeSpent: timeSpent || 0
    });

    await attempt.save();

    res.status(200).json({
      success: true,
      message: 'Answer submitted successfully',
      data: {
        questionId,
        isCorrect,
        points,
        totalAnswered: attempt.answers.length,
        totalQuestions: attempt.totalQuestions
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting answer'
    });
  }
};

// @desc    Submit quiz attempt (Student only)
// @route   POST /api/quiz-attempts/:attemptId/submit
// @access  Private (Student)
const submitQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;

    // Get attempt
    const attempt = await QuizAttempt.findById(attemptId).populate('quiz');
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    // Check if user owns this attempt
    if (attempt.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if attempt is still active
    if (attempt.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'This quiz attempt is already completed'
      });
    }

    // Complete the attempt
    attempt.status = attempt.isExpired(attempt.quiz.duration) ? 'time-expired' : 'completed';
    attempt.endTime = new Date();
    attempt.submittedAt = new Date();

    await attempt.save();

    // Prepare result data
    const resultData = {
      attempt: {
        id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startTime: attempt.startTime,
        endTime: attempt.endTime,
        timeSpent: attempt.timeSpent,
        submittedAt: attempt.submittedAt
      },
      quiz: {
        id: attempt.quiz._id,
        title: attempt.quiz.title,
        totalMarks: attempt.quiz.totalMarks,
        showResults: attempt.quiz.showResults
      },
      results: {
        score: attempt.score,
        percentage: attempt.percentage,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        incorrectAnswers: attempt.incorrectAnswers,
        unanswered: attempt.unanswered
      }
    };

    // Include detailed results if quiz allows it
    if (attempt.quiz.showResults) {
      const detailedResults = attempt.quiz.questions.map(question => {
        const userAnswer = attempt.answers.find(
          answer => answer.questionId.toString() === question._id.toString()
        );

        const correctOptionIndex = question.options.findIndex(option => option.isCorrect);

        return {
          questionId: question._id,
          questionText: question.questionText,
          options: question.options.map(option => option.text),
          correctOptionIndex,
          userSelectedIndex: userAnswer ? userAnswer.selectedOptionIndex : null,
          isCorrect: userAnswer ? userAnswer.isCorrect : false,
          points: question.points,
          earnedPoints: userAnswer ? userAnswer.points : 0,
          explanation: question.explanation
        };
      });

      resultData.detailedResults = detailedResults;
    }

    res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: resultData
    });
  } catch (error) {
    console.error('Submit quiz attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting quiz'
    });
  }
};

// @desc    Get student's quiz attempts
// @route   GET /api/quiz-attempts/my-attempts
// @access  Private (Student)
const getMyAttempts = async (req, res) => {
  try {
    const { page = 1, limit = 10, quizId } = req.query;
    const studentId = req.user.id;

    // Build filter
    const filter = { student: studentId };
    if (quizId) filter.quiz = quizId;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get attempts
    const attempts = await QuizAttempt.find(filter)
      .populate('quiz', 'title subject totalMarks duration')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await QuizAttempt.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        attempts: attempts.map(attempt => ({
          id: attempt._id,
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          score: attempt.score,
          percentage: attempt.percentage,
          timeSpent: attempt.timeSpent,
          startTime: attempt.startTime,
          endTime: attempt.endTime,
          quiz: {
            id: attempt.quiz._id,
            title: attempt.quiz.title,
            subject: attempt.quiz.subject,
            totalMarks: attempt.quiz.totalMarks,
            duration: attempt.quiz.duration
          }
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalAttempts: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get my attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching attempts'
    });
  }
};

// @desc    Get all attempts for a quiz (Faculty only)
// @route   GET /api/quiz-attempts/quiz/:quizId/attempts
// @access  Private (Faculty, Admin)
const getQuizAttempts = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { status } = req.query;

    // Get quiz and check permissions
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check if faculty owns this quiz
    if (req.user.role === 'faculty' && quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view attempts for your own quizzes.'
      });
    }

    // Build filter
    const filter = { quiz: quizId };
    if (status) filter.status = status;

    // Get all attempts for this quiz
    const attempts = await QuizAttempt.find(filter)
      .populate('student', 'firstName lastName username email department')
      .sort({ submittedAt: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          totalMarks: quiz.totalMarks
        },
        attempts: attempts.map(attempt => ({
          id: attempt._id,
          student: {
            id: attempt.student._id,
            name: `${attempt.student.firstName} ${attempt.student.lastName}`,
            username: attempt.student.username,
            email: attempt.student.email,
            department: attempt.student.department
          },
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          score: attempt.score,
          percentage: attempt.percentage,
          totalQuestions: attempt.totalQuestions,
          correctAnswers: attempt.correctAnswers,
          incorrectAnswers: attempt.incorrectAnswers,
          unanswered: attempt.unanswered,
          startTime: attempt.startTime,
          endTime: attempt.endTime,
          timeSpent: attempt.timeSpent,
          submittedAt: attempt.submittedAt
        })),
        totalAttempts: attempts.length
      }
    });
  } catch (error) {
    console.error('Get quiz attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching quiz attempts'
    });
  }
};

// @desc    Get quiz attempt results (Student - own attempts, Faculty - own quiz attempts)
// @route   GET /api/quiz-attempts/:attemptId/results
// @access  Private
const getAttemptResults = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await QuizAttempt.findById(attemptId)
      .populate('quiz')
      .populate('student', 'firstName lastName username');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    // Check permissions
    const userRole = req.user.role;
    if (userRole === 'student' && attempt.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (userRole === 'faculty' && attempt.quiz.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if attempt is completed
    if (attempt.status === 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Quiz attempt is still in progress'
      });
    }

    // Prepare result data
    const resultData = {
      attempt: {
        id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startTime: attempt.startTime,
        endTime: attempt.endTime,
        timeSpent: attempt.timeSpent,
        submittedAt: attempt.submittedAt
      },
      student: userRole !== 'student' ? {
        id: attempt.student._id,
        name: `${attempt.student.firstName} ${attempt.student.lastName}`,
        username: attempt.student.username
      } : undefined,
      quiz: {
        id: attempt.quiz._id,
        title: attempt.quiz.title,
        subject: attempt.quiz.subject,
        totalMarks: attempt.quiz.totalMarks,
        duration: attempt.quiz.duration
      },
      results: {
        score: attempt.score,
        percentage: attempt.percentage,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        incorrectAnswers: attempt.incorrectAnswers,
        unanswered: attempt.unanswered
      }
    };

    // Include detailed results if quiz allows it or if user is faculty/admin
    if (attempt.quiz.showResults || userRole === 'faculty' || userRole === 'admin') {
      const detailedResults = attempt.quiz.questions.map(question => {
        const userAnswer = attempt.answers.find(
          answer => answer.questionId.toString() === question._id.toString()
        );

        const correctOptionIndex = question.options.findIndex(option => option.isCorrect);

        return {
          questionId: question._id,
          questionText: question.questionText,
          options: question.options.map(option => option.text),
          correctOptionIndex,
          userSelectedIndex: userAnswer ? userAnswer.selectedOptionIndex : null,
          isCorrect: userAnswer ? userAnswer.isCorrect : false,
          points: question.points,
          earnedPoints: userAnswer ? userAnswer.points : 0,
          explanation: question.explanation,
          timeSpent: userAnswer ? userAnswer.timeSpent : 0
        };
      });

      resultData.detailedResults = detailedResults;
    }

    res.status(200).json({
      success: true,
      data: resultData
    });
  } catch (error) {
    console.error('Get attempt results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching results'
    });
  }
};

module.exports = {
  startQuizAttempt,
  getQuizQuestions,
  submitAnswer,
  submitQuizAttempt,
  getMyAttempts,
  getQuizAttempts,
  getAttemptResults
};