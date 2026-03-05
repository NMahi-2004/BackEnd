const mongoose = require('mongoose');

const pdfUploadHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['processed', 'pending', 'failed'],
    default: 'processed'
  },
  summary: {
    short: String,
    detailed: String,
    keyPoints: [String],
    topics: [String]
  },
  quiz: {
    questions: [{
      id: String,
      question: String,
      options: [String],
      correct_answer: String,
      topic: String,
      source: String,
      difficulty: String
    }],
    totalQuestions: Number,
    topicsCovered: [String],
    timeLimit: Number // in seconds
  },
  quizAttempts: [{
    attemptDate: {
      type: Date,
      default: Date.now
    },
    answers: [{
      questionId: String,
      userAnswer: String
    }],
    score: Number,
    totalQuestions: Number,
    percentage: Number,
    timeSpent: Number, // in seconds
    completed: Boolean
  }]
}, {
  timestamps: true
});

// Index for faster queries
pdfUploadHistorySchema.index({ user: 1, uploadDate: -1 });

module.exports = mongoose.model('PdfUploadHistory', pdfUploadHistorySchema);
