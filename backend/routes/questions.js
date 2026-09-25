const express = require('express');
const router = express.Router();
const { Question, Progress, Plan } = require('../models');
const { firstReviewDue } = require('../utils/spacedRepetition');
const validateId = require('../middleware/validateId');

// Get questions by topic
router.get('/topic/:topicId', validateId('topicId'), async (req, res) => {
  try {
    const questions = await Question.find({ topicId: req.params.topicId })
      .sort({ order: 1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single question
router.get('/:id', validateId(), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create question
router.post('/', async (req, res) => {
  try {
    const { topicId, subjectId, title, difficulty, platform, link, order } = req.body;
    const question = new Question({
      topicId, subjectId, title, difficulty, platform, link, order
    });
    await question.save();

    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update question (including checkbox status)
router.put('/:id', validateId(), async (req, res) => {
  try {
    const updateData = req.body;

    // If status changed to Done, kick off the spaced-repetition schedule
    if (updateData.status === 'Done') {
      const question = await Question.findById(req.params.id);
      if (question && question.status !== 'Done') {
        // Kick off the spaced-repetition schedule for this question, if it
        // isn't already running (idempotent — see the /init route). The
        // checkbox itself stays a simple manual toggle; this is what makes
        // "Done" actually start the Due-Today / Test Recall cycle underneath it.
        const existingProgress = await Progress.findOne({ questionId: question._id });
        if (!existingProgress) {
          await Progress.create({
            questionId: question._id,
            topicId: question.topicId,
            subjectId: question.subjectId,
            revisionDates: [],
            nextRevision: firstReviewDue()
          });
        }
      }
    }

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update question content (approach, code, etc.)
router.put('/:id/content', validateId(), async (req, res) => {
  try {
    const { approach, code, complexity, notes } = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { approach, code, complexity, notes },
      { new: true }
    );
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete question
router.delete('/:id', validateId(), async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    await Progress.deleteOne({ questionId: question._id });

    // Any active/past Plan may have this question in its sequence — pull it
    // out so Due Today / plan progress never points at a question that no
    // longer exists. Removing it from the middle just shifts everything
    // after it forward by one slot, which is what we want (the day-based
    // slicing in planEngine.js is purely index-driven).
    await Plan.updateMany({}, { $pull: { sequence: { questionId: question._id } } });

    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk create questions
router.post('/bulk', async (req, res) => {
  try {
    const { questions } = req.body;
    const created = await Question.insertMany(questions);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
