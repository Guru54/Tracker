const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  platform: {
    type: String,
    default: 'LeetCode'
  },
  link: {
    type: String,
    default: ''
  },
  // Full problem text/summary, shown above the approaches.
  problemStatement: {
    type: String,
    default: ''
  },
  // A question can have multiple solving approaches (brute force, better,
  // optimal, etc.), each fully self-contained — its own intuition, prose
  // explanation, code, and complexity. This replaces the old flat
  // approach/code/complexity fields, which could only ever hold one
  // approach and silently overwrote it if you tried to add a second.
  approaches: {
    type: [{
      title: { type: String, default: '' },
      intuition: { type: String, default: '' },
      explanation: { type: String, default: '' },
      code: { type: String, default: '' },
      timeComplexity: { type: String, default: '' },
      spaceComplexity: { type: String, default: '' }
    }],
    default: []
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Done', 'Revisit'],
    default: 'Not Started'
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Question', QuestionSchema);
