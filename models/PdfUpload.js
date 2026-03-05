const mongoose = require('mongoose');

const pdfUploadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  summary: {
    short: String,
    detailed: String
  },
  keyTopics: [String],
  quiz: {
    questions: [{
      id: String,
      question: String,
      options: [String],
      correctAnswer: String,
      topic: String
    }],
    totalQuestions: Number
  },
  quizAttempts: [{
    attemptDate: {
      type: Date,
      default: Date.now
    },
    answers: [{
      questionId: String,
      userAnswer: String,
      isCorrect: Boolean,
      timeTaken: Number
    }],
    score: Number,
    percentage: Number,
    weakTopics: [String],
    strongTopics: [String]
  }],
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PdfUpload', pdfUploadSchema);
