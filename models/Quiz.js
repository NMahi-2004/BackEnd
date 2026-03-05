const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [1000, 'Question text cannot exceed 1000 characters']
  },
  options: [{
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
      maxlength: [500, 'Option text cannot exceed 500 characters']
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  points: {
    type: Number,
    default: 1,
    min: [0.5, 'Points must be at least 0.5'],
    max: [10, 'Points cannot exceed 10']
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: [500, 'Explanation cannot exceed 500 characters']
  }
}, {
  _id: true
});

// Validate that there are at least 2 options and exactly one correct answer
questionSchema.path('options').validate(function(options) {
  if (options.length < 2) {
    throw new Error('Each question must have at least 2 options');
  }
  
  if (options.length > 6) {
    throw new Error('Each question cannot have more than 6 options');
  }
  
  const correctOptions = options.filter(option => option.isCorrect);
  if (correctOptions.length !== 1) {
    throw new Error('Each question must have exactly one correct answer');
  }
  
  return true;
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    maxlength: [200, 'Quiz title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Quiz description cannot exceed 1000 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [100, 'Subject cannot exceed 100 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false // Optional for backward compatibility
  },
  duration: {
    type: Number,
    required: [true, 'Quiz duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [300, 'Duration cannot exceed 300 minutes (5 hours)']
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  questions: [questionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Quiz creator is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  allowedAttempts: {
    type: Number,
    default: 1,
    min: [1, 'Must allow at least 1 attempt'],
    max: [10, 'Cannot allow more than 10 attempts']
  },
  showResults: {
    type: Boolean,
    default: true
  },
  shuffleQuestions: {
    type: Boolean,
    default: false
  },
  shuffleOptions: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate total marks before saving
quizSchema.pre('save', async function() {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((total, question) => total + question.points, 0);
  }
});

// Instance method to get quiz statistics
quizSchema.methods.getStatistics = async function() {
  const QuizAttempt = mongoose.model('QuizAttempt');
  
  const attempts = await QuizAttempt.find({ quiz: this._id });
  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter(attempt => attempt.status === 'completed');
  
  if (completedAttempts.length === 0) {
    return {
      totalAttempts,
      completedAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0
    };
  }
  
  const scores = completedAttempts.map(attempt => attempt.score);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const passRate = (completedAttempts.filter(attempt => attempt.score >= (this.totalMarks * 0.6)).length / completedAttempts.length) * 100;
  
  return {
    totalAttempts,
    completedAttempts: completedAttempts.length,
    averageScore: Math.round(averageScore * 100) / 100,
    highestScore,
    lowestScore,
    passRate: Math.round(passRate * 100) / 100
  };
};

// Static method to find active quizzes
quizSchema.statics.findActiveQuizzes = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    startDate: { $lte: now },
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gte: now } }
    ]
  });
};

module.exports = mongoose.model('Quiz', quizSchema);