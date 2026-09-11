const express = require('express');
const router = express.Router();
const { Subject, Topic, Question, Progress, Plan } = require('../models');
const validateId = require('../middleware/validateId');

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 });

    // Calculate progress for each subject
    const subjectsWithProgress = await Promise.all(
      subjects.map(async (subject) => {
        const totalQs = await Question.countDocuments({ subjectId: subject._id });
        const solvedQs = await Question.countDocuments({ 
          subjectId: subject._id, 
          status: 'Done' 
        });

        return {
          ...subject.toObject(),
          totalQuestions: totalQs,
          solvedQuestions: solvedQs,
          progress: totalQs > 0 ? Math.round((solvedQs / totalQs) * 100) : 0
        };
      })
    );

    res.json(subjectsWithProgress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single subject with topics
router.get('/:id', validateId(), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const topics = await Topic.find({ subjectId: subject._id }).sort({ order: 1 });

    // Get question counts per topic
    const topicsWithCounts = await Promise.all(
      topics.map(async (topic) => {
        const totalQs = await Question.countDocuments({ topicId: topic._id });
        const solvedQs = await Question.countDocuments({ 
          topicId: topic._id, 
          status: 'Done' 
        });

        return {
          ...topic.toObject(),
          totalQuestions: totalQs,
          solvedQuestions: solvedQs
        };
      })
    );

    const totalQs = await Question.countDocuments({ subjectId: subject._id });
    const solvedQs = await Question.countDocuments({ 
      subjectId: subject._id, 
      status: 'Done' 
    });

    res.json({
      ...subject.toObject(),
      totalQuestions: totalQs,
      solvedQuestions: solvedQs,
      progress: totalQs > 0 ? Math.round((solvedQs / totalQs) * 100) : 0,
      topics: topicsWithCounts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new subject
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    const subject = new Subject({ name, description });
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update subject
router.put('/:id', validateId(), async (req, res) => {
  try {
    const { name, description } = req.body;
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete subject
router.delete('/:id', validateId(), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    // Cascade delete topics and questions
    const topics = await Topic.find({ subjectId: subject._id });
    const topicIds = topics.map(t => t._id);

    await Topic.deleteMany({ subjectId: subject._id });
    await Question.deleteMany({ subjectId: subject._id });
    await Progress.deleteMany({ subjectId: subject._id });
    await Plan.updateMany({}, { $pull: { sequence: { subjectId: subject._id } } });

    res.json({ message: 'Subject and all related content deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
