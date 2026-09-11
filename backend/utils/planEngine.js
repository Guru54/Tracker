const { INTERVALS } = require('./spacedRepetition');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Helper to format a Date object back to YYYY-MM-DD
function formatDate(dateObj) {
  return dateObj.toISOString().slice(0, 10);
}

// Parses string safely to local midnight Date object
function parseDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

function addDaysStr(dateStr, days) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function isStudyDay(dateStr, studyDays) {
  if (studyDays === 'daily') return true;
  const dow = parseDate(dateStr).getDay(); // 0 = Sunday ... 6 = Saturday
  if (studyDays === '6day') return dow !== 0;
  if (studyDays === '5day') return dow >= 1 && dow <= 5;
  return true;
}

// Optimized helper using a single Date object to avoid repeatedly parsing strings
function activeDayIndex(startDate, endDate, studyDays) {
  if (endDate < startDate) return 0;
  
  let count = 0;
  const current = parseDate(startDate);
  const end = parseDate(endDate);

  while (current <= end) {
    const dow = current.getDay();
    let isStudy = true;
    if (studyDays === '6day') isStudy = (dow !== 0);
    else if (studyDays === '5day') isStudy = (dow >= 1 && dow <= 5);

    if (isStudy) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function buildSequence(topicsWithQuestions) {
  const queues = topicsWithQuestions.map(t => ({
    subjectId: t.subjectId,
    topicId: t.topicId,
    questions: t.questions.slice(),
    pos: 0
  }));

  const sequence = [];
  let remaining = queues.reduce((sum, q) => sum + q.questions.length, 0);

  while (remaining > 0) {
    for (const q of queues) {
      if (q.pos < q.questions.length) {
        const question = q.questions[q.pos];
        sequence.push({ questionId: question._id, subjectId: q.subjectId, topicId: q.topicId });
        q.pos++;
        remaining--;
      }
    }
  }

  return sequence;
}

function windowForDate(plan, dateStr) {
  const { sequence, startDate, dailyQuota, studyDays } = plan;
  if (dateStr < startDate) return [];

  const upToYesterday = activeDayIndex(startDate, addDaysStr(dateStr, -1), studyDays) * dailyQuota;
  const upToToday = isStudyDay(dateStr, studyDays) ? upToYesterday + dailyQuota : upToYesterday;

  const from = Math.min(upToYesterday, sequence.length);
  const to = Math.min(upToToday, sequence.length);
  return sequence.slice(from, to);
}

function assignedSoFar(plan, dateStr) {
  const { sequence, startDate, dailyQuota, studyDays } = plan;
  const count = activeDayIndex(startDate, dateStr, studyDays) * dailyQuota;
  return Math.min(count, sequence.length);
}

// Optimized with a single running Date object
function projectedFinishDate(plan, fromDate) {
  const { sequence, startDate, dailyQuota, studyDays } = plan;
  
  if (!sequence || sequence.length === 0 || !dailyQuota || dailyQuota <= 0) {
    return startDate;
  }

  const totalStudyDaysNeeded = Math.ceil(sequence.length / dailyQuota);
  
  let currentStudyDays = 0;
  const current = parseDate(startDate);
  let safety = 0;

  while (currentStudyDays < totalStudyDaysNeeded && safety < 10000) {
    const dow = current.getDay();
    let isStudy = true;
    if (studyDays === '6day') isStudy = (dow !== 0);
    else if (studyDays === '5day') isStudy = (dow >= 1 && dow <= 5);

    if (isStudy) {
      currentStudyDays++;
    }
    if (currentStudyDays < totalStudyDaysNeeded) {
      current.setDate(current.getDate() + 1);
    }
    safety++;
  }
  return formatDate(current);
}

// Optimized to use a Map for scheduled reviews instead of scanning/filtering an array
function simulatePreview({ sequence, startDate, dailyQuota, studyDays }) {
  if (!sequence || sequence.length === 0 || !dailyQuota || dailyQuota <= 0) {
    return [];
  }

  const days = [];
  const currentDateObj = parseDate(startDate);
  
  // Maps a date string 'YYYY-MM-DD' to an array of scheduled items: { touch: number }
  const scheduleMap = new Map(); 
  
  let safety = 0;
  let accumulatedAssigned = 0;
  let currentStudyDays = 0;

  while (accumulatedAssigned < sequence.length && safety < 5000) {
    const dStr = formatDate(currentDateObj);
    const dow = currentDateObj.getDay();
    
    let isStudy = true;
    if (studyDays === '6day') isStudy = (dow !== 0);
    else if (studyDays === '5day') isStudy = (dow >= 1 && dow <= 5);

    let newItemsCount = 0;

    if (isStudy) {
      currentStudyDays++;
      const from = accumulatedAssigned;
      const to = Math.min(currentStudyDays * dailyQuota, sequence.length);
      newItemsCount = to - from;
      accumulatedAssigned = to;

      // Schedule the first interval touch for the newly added items
      if (newItemsCount > 0 && INTERVALS.length > 0) {
        const nextDateStr = addDaysStr(dStr, INTERVALS[0]);
        if (!scheduleMap.has(nextDateStr)) {
          scheduleMap.set(nextDateStr, []);
        }
        const targetList = scheduleMap.get(nextDateStr);
        for (let i = 0; i < newItemsCount; i++) {
          targetList.push({ touch: 1 });
        }
      }
    }

    // Retrieve items scheduled for today
    const dueToday = scheduleMap.get(dStr) || [];
    scheduleMap.delete(dStr); // Clean up memory for processed day

    // Process reviews and schedule their next touches
    dueToday.forEach(item => {
      if (item.touch < INTERVALS.length) {
        const nextDateStr = addDaysStr(dStr, INTERVALS[item.touch]);
        if (!scheduleMap.has(nextDateStr)) {
          scheduleMap.set(nextDateStr, []);
        }
        scheduleMap.get(nextDateStr).push({ touch: item.touch + 1 });
      }
    });

    days.push({
      date: dStr,
      isStudyDay: isStudy,
      newCount: newItemsCount,
      estimatedDueCount: dueToday.length,
      estimatedCombinedLoad: newItemsCount + dueToday.length
    });

    currentDateObj.setDate(currentDateObj.getDate() + 1);
    safety++;
  }

  return days;
}

module.exports = {
  todayStr,
  addDaysStr,
  isStudyDay,
  activeDayIndex,
  buildSequence,
  windowForDate,
  assignedSoFar,
  projectedFinishDate,
  simulatePreview
};
