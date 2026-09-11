const express = require('express');
const router = express.Router();
const { Plan, Question, Topic } = require('../models');
const validateId = require('../middleware/validateId');
const {
  todayStr,
  buildSequence,
  windowForDate,
  assignedSoFar,
  projectedFinishDate,
  simulatePreview
} = require('../utils/planEngine');

// selectedTopics: [{ subjectId, topicId }] (topicName optional, ignored if present)
// Resolves each topic's actual questions, in whatever order they were created.
async function resolveTopicsWithQuestions(selectedTopics) {
  const topicIds = selectedTopics.map(t => t.topicId);
  const topics = await Topic.find({ _id: { $in: topicIds } });
  const topicById = Object.fromEntries(topics.map(t => [String(t._id), t]));

  const resolved = [];
  for (const sel of selectedTopics) {
    const topic = topicById[sel.topicId];
    if (!topic) continue;
    const questions = await Question.find({ topicId: topic._id }).sort({ createdAt: 1 });
    resolved.push({ subjectId: sel.subjectId || topic.subjectId, topicId: topic._id, questions });
  }
  return resolved;
}

function deriveDailyQuota(mode, dailyQuota, targetDate, totalQuestions, studyDays) {
  if (mode === 'pace') return Math.max(1, parseInt(dailyQuota) || 1);
  const days = Math.max(1, Math.ceil((new Date(targetDate) - Date.now()) / (24 * 60 * 60 * 1000)));
  const perWeek = studyDays === '5day' ? 5 : studyDays === '6day' ? 6 : 7;
  const activeDays = Math.max(1, Math.round(days * (perWeek / 7)));
  return Math.max(1, Math.ceil(totalQuestions / activeDays));
}

// Get all plans
router.get('/', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active plan with today's targets (real Question docs, so the existing
// Dashboard rendering — which reads question.title/difficulty/platform/status —
// keeps working unchanged).
router.get('/active', async (req, res) => {
  try {
    const plan = await Plan.findOne({ isActive: true });
    if (!plan) return res.json({ plan: null, targets: [] });

    const today = todayStr();
    const todayWindow = windowForDate(plan, today);
    const questionIds = todayWindow.map(e => e.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const byId = Object.fromEntries(questions.map(q => [String(q._id), q]));
    const targets = todayWindow.map(e => byId[String(e.questionId)]).filter(Boolean);

    const soFar = assignedSoFar(plan, today);

    res.json({
      plan: {
        _id: plan._id,
        name: plan.name,
        mode: plan.mode,
        dailyQuota: plan.dailyQuota,
        studyDays: plan.studyDays,
        startDate: plan.startDate,
        totalQuestions: plan.sequence.length,
        assignedSoFar: soFar,
        finished: soFar >= plan.sequence.length,
        projectedFinishDate: projectedFinishDate(plan, today)
      },
      targets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single plan
router.get('/:id', validateId(), async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create plan
router.post('/', async (req, res) => {
  try {
    const { name, selectedTopics, mode, dailyQuota, targetDate, studyDays } = req.body;

    if (!Array.isArray(selectedTopics) || selectedTopics.length === 0) {
      return res.status(400).json({ error: 'selectedTopics must be a non-empty array' });
    }

    const resolvedTopics = await resolveTopicsWithQuestions(selectedTopics);
    const sequence = buildSequence(resolvedTopics).map(e => ({
      questionId: e.questionId, subjectId: e.subjectId, topicId: e.topicId
    }));

    if (sequence.length === 0) {
      return res.status(400).json({ error: 'Selected topics have no questions' });
    }

    const finalStudyDays = studyDays || 'daily';
    const finalDailyQuota = deriveDailyQuota(mode, dailyQuota, targetDate, sequence.length, finalStudyDays);

    await Plan.updateMany({ isActive: true }, { isActive: false });

    const plan = await Plan.create({
      name,
      selectedTopics: selectedTopics.map(t => ({
        subjectId: t.subjectId,
        topicId: t.topicId,
        topicName: t.topicName || ''
      })),
      mode,
      dailyQuota: finalDailyQuota,
      targetDate: mode === 'deadline' ? new Date(targetDate) : null,
      studyDays: finalStudyDays,
      sequence,
      startDate: todayStr(),
      isActive: true
    });

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update plan (e.g. { isActive: false } to stop it)
router.put('/:id', validateId(), async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete plan
router.delete('/:id', validateId(), async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json({ message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Preview (no DB write): day-by-day forecast including COMBINED load
// (new questions + estimated due-revisions that day), across any mix of
// subjects/topics, respecting the study-days setting.
router.post('/preview', async (req, res) => {
  try {
    const { selectedTopics, mode, dailyQuota, targetDate, studyDays } = req.body;

    if (!Array.isArray(selectedTopics) || selectedTopics.length === 0) {
      return res.status(400).json({ error: 'selectedTopics must be a non-empty array' });
    }

    const resolvedTopics = await resolveTopicsWithQuestions(selectedTopics);
    const sequence = buildSequence(resolvedTopics);
    if (sequence.length === 0) {
      return res.status(400).json({ error: 'Selected topics have no questions' });
    }

    const finalStudyDays = studyDays || 'daily';
    const finalDailyQuota = deriveDailyQuota(mode, dailyQuota, targetDate, sequence.length, finalStudyDays);
    const startDate = todayStr();

    const days = simulatePreview({ sequence, startDate, dailyQuota: finalDailyQuota, studyDays: finalStudyDays });

    res.json({
      totalQuestions: sequence.length,
      dailyQuota: finalDailyQuota,
      studyDays: finalStudyDays,
      totalActiveDays: days.filter(d => d.isStudyDay).length,
      finishDate: days.length ? days[days.length - 1].date : startDate,
      days
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
