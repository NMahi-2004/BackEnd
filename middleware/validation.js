const { body } = require('express-validator');

// Admin signup validation (includes role field for Faculty/Student creation)
const validateAdminSignup = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .matches(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)
    .withMessage('Please provide a valid Gmail address')
    .normalizeEmail(),
  
  body('phone')
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  
  body('role')
    .isIn(['faculty', 'student'])
    .withMessage('Role must be faculty or student')
];

// Login validation (Faculty/Student only)
const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

// Change password validation
const validateChangePassword = [
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  body('currentPassword')
    .optional()
    .notEmpty()
    .withMessage('Current password is required for password change')
];

// Create user validation (Admin creating Faculty/Student)
const validateCreateUser = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phoneNumber')
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .isIn(['faculty', 'student'])
    .withMessage('Role must be faculty or student')
];

// Update user validation
const validateUpdateUser = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phoneNumber')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Assignment validation
const validateCreateAssignment = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Assignment title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Assignment title must be between 3 and 200 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Assignment description is required')
    .isLength({ min: 3, max: 5000 })
    .withMessage('Description must be between 3 and 5000 characters'),
  
  body('course')
    .trim()
    .notEmpty()
    .withMessage('Course is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Course name must be between 2 and 100 characters'),
  
  body('assignmentType')
    .isIn(['text', 'file_upload', 'mixed'])
    .withMessage('Assignment type must be text, file_upload, or mixed'),
  
  body('totalMarks')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total marks must be between 1 and 1000'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  
  body('allowLateSubmission')
    .optional()
    .isBoolean()
    .withMessage('Allow late submission must be a boolean value'),
  
  body('lateSubmissionDeadline')
    .optional()
    .if(body('allowLateSubmission').equals(true))
    .isISO8601()
    .withMessage('Late submission deadline must be a valid date when late submissions are allowed')
];

// Assignment questions validation
const validateAssignmentQuestions = [
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  
  body('questions.*.questionText')
    .trim()
    .notEmpty()
    .withMessage('Question text is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Question text must be between 10 and 2000 characters'),
  
  body('questions.*.questionType')
    .isIn(['descriptive', 'short_answer', 'file_upload'])
    .withMessage('Question type must be descriptive, short_answer, or file_upload'),
  
  body('questions.*.marks')
    .isFloat({ min: 0.5, max: 100 })
    .withMessage('Question marks must be between 0.5 and 100')
];

// Assignment submission validation
const validateAssignmentSubmission = [
  body('answers')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Answers must be an array with at least one answer'),
  
  body('answers.*.questionId')
    .optional()
    .isMongoId()
    .withMessage('Question ID must be a valid MongoDB ObjectId'),
  
  body('answers.*.answerText')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Answer text cannot exceed 5000 characters'),
  
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Content cannot exceed 10000 characters'),
  
  body('answers.*.fileUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('File URL must be a valid URL')
];

// Assignment evaluation validation
const validateAssignmentEvaluation = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('At least one answer evaluation is required'),
  
  body('answers.*.questionId')
    .notEmpty()
    .withMessage('Question ID is required')
    .isMongoId()
    .withMessage('Question ID must be a valid MongoDB ObjectId'),
  
  body('answers.*.marks')
    .isFloat({ min: 0 })
    .withMessage('Marks must be a non-negative number'),
  
  body('answers.*.feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback cannot exceed 1000 characters'),
  
  body('generalFeedback')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('General feedback cannot exceed 2000 characters')
];

// Quiz validation
const validateCreateQuiz = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Quiz title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Quiz title must be between 3 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Subject must be between 2 and 100 characters'),
  
  body('duration')
    .isInt({ min: 1, max: 300 })
    .withMessage('Duration must be between 1 and 300 minutes'),
  
  body('allowedAttempts')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Allowed attempts must be between 1 and 10'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  body('showResults')
    .optional()
    .isBoolean()
    .withMessage('Show results must be a boolean value'),
  
  body('shuffleQuestions')
    .optional()
    .isBoolean()
    .withMessage('Shuffle questions must be a boolean value'),
  
  body('shuffleOptions')
    .optional()
    .isBoolean()
    .withMessage('Shuffle options must be a boolean value'),
  
  body('questions')
    .isArray({ min: 1 })
    .withMessage('Quiz must have at least 1 question'),
  
  body('questions.*.questionText')
    .trim()
    .notEmpty()
    .withMessage('Question text is required')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Question text must be between 5 and 1000 characters'),
  
  body('questions.*.options')
    .isArray({ min: 2, max: 6 })
    .withMessage('Each question must have between 2 and 6 options'),
  
  body('questions.*.options.*.text')
    .trim()
    .notEmpty()
    .withMessage('Option text is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Option text must be between 1 and 500 characters'),
  
  body('questions.*.options.*.isCorrect')
    .isBoolean()
    .withMessage('isCorrect must be a boolean value'),
  
  body('questions.*.points')
    .optional()
    .isFloat({ min: 0.5, max: 10 })
    .withMessage('Points must be between 0.5 and 10'),
  
  body('questions.*.explanation')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Explanation cannot exceed 500 characters')
];

// Update quiz validation (same as create but all fields optional)
const validateUpdateQuiz = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Quiz title cannot be empty')
    .isLength({ min: 3, max: 200 })
    .withMessage('Quiz title must be between 3 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('subject')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Subject must be between 2 and 100 characters'),
  
  body('duration')
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage('Duration must be between 1 and 300 minutes'),
  
  body('allowedAttempts')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Allowed attempts must be between 1 and 10'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  body('showResults')
    .optional()
    .isBoolean()
    .withMessage('Show results must be a boolean value'),
  
  body('shuffleQuestions')
    .optional()
    .isBoolean()
    .withMessage('Shuffle questions must be a boolean value'),
  
  body('shuffleOptions')
    .optional()
    .isBoolean()
    .withMessage('Shuffle options must be a boolean value'),
  
  body('questions')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Quiz must have at least 1 question'),
  
  body('questions.*.questionText')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Question text cannot be empty')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Question text must be between 10 and 1000 characters'),
  
  body('questions.*.options')
    .optional()
    .isArray({ min: 2, max: 6 })
    .withMessage('Each question must have between 2 and 6 options'),
  
  body('questions.*.options.*.text')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Option text cannot be empty')
    .isLength({ min: 1, max: 500 })
    .withMessage('Option text must be between 1 and 500 characters'),
  
  body('questions.*.options.*.isCorrect')
    .optional()
    .isBoolean()
    .withMessage('isCorrect must be a boolean value'),
  
  body('questions.*.points')
    .optional()
    .isFloat({ min: 0.5, max: 10 })
    .withMessage('Points must be between 0.5 and 10'),
  
  body('questions.*.explanation')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Explanation cannot exceed 500 characters')
];

// Submit answer validation
const validateSubmitAnswer = [
  body('questionId')
    .notEmpty()
    .withMessage('Question ID is required')
    .isMongoId()
    .withMessage('Question ID must be a valid MongoDB ObjectId'),
  
  body('selectedOptionIndex')
    .isInt({ min: 0 })
    .withMessage('Selected option index must be a non-negative integer'),
  
  body('timeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Time spent must be a non-negative integer')
];

module.exports = {
  validateAdminSignup,
  validateLogin,
  validateChangePassword,
  validateCreateUser,
  validateUpdateUser,
  validateCreateAssignment,
  validateAssignmentQuestions,
  validateAssignmentSubmission,
  validateAssignmentEvaluation,
  validateCreateQuiz,
  validateUpdateQuiz,
  validateSubmitAnswer
};