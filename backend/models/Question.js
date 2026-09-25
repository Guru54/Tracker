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
  approach: {
    type: String,
    default: ''
  },
  code: {
    type: String,
    default: ''
  },
  complexity: {
    time: { type: String, default: '' },
    space: { type: String, default: '' }
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
