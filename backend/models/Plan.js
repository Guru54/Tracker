const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Any mix of topics across any subjects — no longer locked to one subject.
  selectedTopics: [{
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
    topicName: String
  }],
  mode: {
    type: String,
    enum: ['pace', 'deadline'],
    required: true
  },
  dailyQuota: {
    type: Number,
    default: 5
  },
  targetDate: {
    type: Date,
    default: null
  },
  studyDays: {
    type: String,
    enum: ['daily', '6day', '5day'],
    default: 'daily'
  },
  // Materialized round-robin order of question IDs, built once at creation
  // time from the selected topics (interleaved, not one-topic-at-a-time).
  // "Today's window" is a pure slice of this array based on elapsed
  // calendar study-days — see utils/planEngine.js. That's also what makes a
  // missed day a permanent skip: tomorrow's slice moves forward regardless
  // of whether today's items got done.
  sequence: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: String, // 'YYYY-MM-DD' — plain calendar date, no timezone ambiguity
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Plan', PlanSchema);
