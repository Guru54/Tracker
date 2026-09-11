// Spaced repetition schedule: 1 -> 7 -> 21 -> 45 days, then steady-state
// repeats every 45 days. This must match whatever the frontend shows.
const INTERVALS = [1, 7, 21, 45];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// How many days until the next revision, given how many PASSED revisions
// this item has had so far (fails don't advance the interval — see below).
function nextIntervalDays(passCount) {
  if (passCount < INTERVALS.length) return INTERVALS[passCount];
  return INTERVALS[INTERVALS.length - 1]; // steady-state: every 45 days
}

// Call when a question is first marked Done — schedules its first revision.
function firstReviewDue(fromDate = new Date()) {
  return addDays(fromDate, INTERVALS[0]);
}

// Call after a Test Recall attempt. On a pass, move to the next interval
// based on how many total passes this item now has. On a fail, DO NOT
// advance to a longer interval — reset back to the shortest one, since a
// failed recall means the material isn't actually retained yet and needs
// to come back sooner, not later.
function computeNextRevision(revisionDates, passed, fromDate = new Date()) {
  const passCountBeforeThis = revisionDates.filter(r => r.grade === 'pass').length;
  if (passed) {
    return addDays(fromDate, nextIntervalDays(passCountBeforeThis + 1));
  }
  return addDays(fromDate, INTERVALS[0]);
}

module.exports = { INTERVALS, addDays, nextIntervalDays, firstReviewDue, computeNextRevision };
