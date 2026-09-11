const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
    unique: true
  },
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
  // Recall history — one entry per Test Recall attempt. `grade` is the
  // recall result itself ("did you actually remember it"), NOT the
  // question's difficulty — those are two different things and the old
  // schema conflated them by reusing the Easy/Medium/Hard enum here.
  revisionDates: [{
    date: { type: Date, default: Date.now },
    grade: {
      type: String,
      enum: ['pass', 'fail']
    }
  }],
  nextRevision: {
    type: Date,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Progress', ProgressSchema);
