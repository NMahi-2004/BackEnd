const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selectedOptionIndex: {
    type: Number,
    required: true,
    min: 0
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0,
    min: 0
  }
}, {
  _id: false
});

const quizAttemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: [true, 'Quiz reference is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned', 'time-expired'],
    default: 'in-progress'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  answers: [answerSchema],
  score: {
    type: Number,
    default: 0,
    min: 0
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  correctAnswers: {
    type: Number,
    default: 0,
    min: 0
  },
  incorrectAnswers: {
    type: Number,
    default: 0,
    min: 0
  },
  unanswered: {
    type: Number,
    default: 0,
    min: 0
  },
  submittedAt: {
    type: Date
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique attempts per student per quiz
quizAttemptSchema.index({ quiz: 1, student: 1, attemptNumber: 1 }, { unique: true });

// Index for efficient queries
quizAttemptSchema.index({ student: 1, status: 1 });
quizAttemptSchema.index({ quiz: 1, status: 1 });

// Calculate score and statistics before saving
quizAttemptSchema.pre('save', function() {
  if (this.answers && this.answers.length > 0) {
    // Calculate score
    this.score = this.answers.reduce((total, answer) => total + answer.points, 0);
    
    // Calculate statistics
    this.correctAnswers = this.answers.filter(answer => answer.isCorrect).length;
    this.incorrectAnswers = this.answers.filter(answer => !answer.isCorrect).length;
    this.unanswered = this.totalQuestions - this.answers.length;
    
    // Calculate time spent
    if (this.endTime && this.startTime) {
      this.timeSpent = Math.floor((this.endTime - this.startTime) / 1000);
    }
  }
});

// Calculate percentage after saving (when we have the quiz total marks)
quizAttemptSchema.post('save', async function(doc) {
  if (doc.status === 'completed' && doc.percentage === 0) {
    try {
      const quiz = await mongoose.model('Quiz').findById(doc.quiz);
      if (quiz && quiz.totalMarks > 0) {
        doc.percentage = Math.round((doc.score / quiz.totalMarks) * 100 * 100) / 100;
        await doc.save();
      }
    } catch (error) {
      console.error('Error calculating percentage:', error);
    }
  }
});

// Instance method to check if attempt is expired
quizAttemptSchema.methods.isExpired = function(quizDuration) {
  if (this.status !== 'in-progress') return false;
  
  const now = new Date();
  const timeLimit = new Date(this.startTime.getTime() + (quizDuration * 60 * 1000));
  return now > timeLimit;
};

// Instance method to get remaining time
quizAttemptSchema.methods.getRemainingTime = function(quizDuration) {
  if (this.status !== 'in-progress') return 0;
  
  const now = new Date();
  const timeLimit = new Date(this.startTime.getTime() + (quizDuration * 60 * 1000));
  const remaining = Math.max(0, Math.floor((timeLimit - now) / 1000));
  
  return remaining;
};

// Static method to get student's attempt count for a quiz
quizAttemptSchema.statics.getAttemptCount = function(quizId, studentId) {
  return this.countDocuments({ quiz: quizId, student: studentId });
};

// Static method to get student's best score for a quiz
quizAttemptSchema.statics.getBestScore = function(quizId, studentId) {
  return this.findOne(
    { quiz: quizId, student: studentId, status: 'completed' },
    {},
    { sort: { score: -1 } }
  );
};

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);