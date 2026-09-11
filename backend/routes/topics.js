const express = require('express');
const router = express.Router();
const { Topic, Question, Progress, Plan } = require('../models');
const validateId = require('../middleware/validateId');

// Get topics by subject
router.get('/subject/:subjectId', validateId('subjectId'), async (req, res) => {
  try {
    const topics = await Topic.find({ subjectId: req.params.subjectId })
      .sort({ order: 1 });

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

    res.json(topicsWithCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single topic with questions
router.get('/:id', validateId(), async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const questions = await Question.find({ topicId: topic._id })
      .sort({ order: 1 });

    res.json({
      ...topic.toObject(),
      questions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create topic
router.post('/', async (req, res) => {
  try {
    const { subjectId, name, description, order } = req.body;
    const topic = new Topic({ subjectId, name, description, order });
    await topic.save();
    res.status(201).json(topic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update topic
router.put('/:id', validateId(), async (req, res) => {
  try {
    const { name, description, order } = req.body;
    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      { name, description, order },
      { new: true }
    );
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete topic
router.delete('/:id', validateId(), async (req, res) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    await Question.deleteMany({ topicId: topic._id });
    await Progress.deleteMany({ topicId: topic._id });
    await Plan.updateMany({}, { $pull: { sequence: { topicId: topic._id } } });

    res.json({ message: 'Topic and all questions deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
