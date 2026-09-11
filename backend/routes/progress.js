const express = require('express');
const router = express.Router();
const { Progress, Question } = require('../models');
const { firstReviewDue, computeNextRevision } = require('../utils/spacedRepetition');
const validateId = require('../middleware/validateId');

// GET /api/progress/due — everything whose next revision is today or earlier.
// This is the actual spaced-repetition engine's output; it is independent of
// the manual `status` checkbox on Question (that's just a to-do checkbox —
// this is what decides what needs a Test Recall today).
router.get('/due', async (req, res) => {
  try {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const due = await Progress.find({ nextRevision: { $lte: endOfToday } })
      .populate('questionId')
      .populate('topicId', 'name')
      .populate('subjectId', 'name');

    const items = due
      .filter(p => p.questionId) // question may have been deleted; skip orphans defensively
      .map(p => ({
        progressId: p._id,
        question: p.questionId,
        topicName: p.topicId?.name || '',
        subjectName: p.subjectId?.name || '',
        nextRevision: p.nextRevision,
        revisionCount: p.revisionDates.length
      }));

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/progress/:questionId — a single question's revision history (used by QuestionPage).
router.get('/:questionId', validateId('questionId'), async (req, res) => {
  try {
    const progress = await Progress.findOne({ questionId: req.params.questionId });
    res.json(progress || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/progress/:questionId/init — called when a question's status
// transitions to "Done" for the first time. Idempotent: if a Progress record
// already exists for this question, it's left untouched (re-checking the
// checkbox shouldn't reset an already-running revision schedule).
router.post('/:questionId/init', validateId('questionId'), async (req, res) => {
  try {
    const { questionId } = req.params;
    const existing = await Progress.findOne({ questionId });
    if (existing) return res.json(existing);

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const progress = await Progress.create({
      questionId,
      topicId: question.topicId,
      subjectId: question.subjectId,
      revisionDates: [],
      nextRevision: firstReviewDue()
    });

    res.status(201).json(progress);
  } catch (error) {
    // Duplicate key race (unique index on questionId) — just return the existing one.
    if (error.code === 11000) {
      const existing = await Progress.findOne({ questionId: req.params.questionId });
      return res.json(existing);
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/progress/:questionId/recall  { passed: true|false }
// Records a Test Recall attempt and reschedules the next revision.
router.post('/:questionId/recall', validateId('questionId'), async (req, res) => {
  try {
    const { questionId } = req.params;
    const { passed } = req.body;
    if (typeof passed !== 'boolean') {
      return res.status(400).json({ error: 'passed (boolean) is required' });
    }

    let progress = await Progress.findOne({ questionId });
    if (!progress) {
      // Defensive: recall attempted on something that was never init'd (e.g.
      // status was set via a raw PUT that skipped the init step). Create it
      // now so the attempt isn't lost.
      const question = await Question.findById(questionId);
      if (!question) return res.status(404).json({ error: 'Question not found' });
      progress = await Progress.create({
        questionId,
        topicId: question.topicId,
        subjectId: question.subjectId,
        revisionDates: []
      });
    }

    const nextRevision = computeNextRevision(progress.revisionDates, passed);
    progress.revisionDates.push({ date: new Date(), grade: passed ? 'pass' : 'fail' });
    progress.nextRevision = nextRevision;
    progress.updatedAt = new Date();
    await progress.save();

    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
