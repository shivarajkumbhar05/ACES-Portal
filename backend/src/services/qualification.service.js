const Attempt = require('../models/Attempt');
const Department = require('../models/Department');
const Qualification = require('../models/Qualification');
const { ROUND2_TOP_N_PER_DEPARTMENT } = require('../config/constants');

/**
 * Deterministic tie-break comparator:
 *   1. Highest score
 *   2. Lowest time taken
 *   3. Earlier submission timestamp
 * Anything still tied after this is flagged for manual admin review rather
 * than resolved arbitrarily.
 */
function compareAttempts(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (a.timeTakenSeconds !== b.timeTakenSeconds) return a.timeTakenSeconds - b.timeTakenSeconds;
  return new Date(a.submittedAt) - new Date(b.submittedAt);
}

function tieBreakReasonFor(rankedList, index) {
  if (index === 0) return null;
  const prev = rankedList[index - 1];
  const cur = rankedList[index];
  if (prev.score !== cur.score) return null; // no tie with the student immediately above
  if (prev.timeTakenSeconds !== cur.timeTakenSeconds) return 'Tied on score, separated by time taken';
  if (new Date(prev.submittedAt).getTime() !== new Date(cur.submittedAt).getTime()) {
    return 'Tied on score and time, separated by submission timestamp';
  }
  return 'Fully tied on score, time, and submission timestamp - requires manual admin review';
}

/**
 * Computes (and persists, as a fresh set of non-finalized records) the
 * department-wise Top 5 qualifiers for Round 2 based on completed Round 1
 * attempts. Safe to re-run before finalization; it replaces prior
 * unfinalized computations. Once `finalized` records exist for a department
 * they are left untouched unless an admin explicitly recomputes.
 */
async function computeRound2Qualification({ fromRound = 1, forRound = 2, topN = ROUND2_TOP_N_PER_DEPARTMENT } = {}) {
  const departments = await Department.find().lean();
  const results = [];

  for (const dept of departments) {
    const alreadyFinalized = await Qualification.exists({
      department: dept._id,
      forRound,
      finalized: true
    });
    if (alreadyFinalized) {
      const existing = await Qualification.find({ department: dept._id, forRound })
        .populate('student')
        .sort({ rank: 1 })
        .lean();
      results.push({ department: dept, finalized: true, qualifiers: existing });
      continue;
    }

    const attempts = await Attempt.find({
      roundNumber: fromRound,
      department: dept._id,
      status: 'completed'
    })
      .populate('student')
      .lean();

    const ranked = [...attempts].sort(compareAttempts);
    const topAttempts = ranked.slice(0, topN);

    // Wipe any previous, non-finalized draft for this department/round.
    await Qualification.deleteMany({ department: dept._id, forRound, finalized: false });

    const docs = await Promise.all(
      topAttempts.map((attempt, index) =>
        Qualification.create({
          department: dept._id,
          fromRound,
          forRound,
          student: attempt.student._id,
          attempt: attempt._id,
          rank: index + 1,
          score: attempt.score,
          timeTakenSeconds: attempt.timeTakenSeconds,
          qualified: true,
          tieBreakReason: tieBreakReasonFor(topAttempts, index),
          finalized: false
        })
      )
    );

    results.push({
      department: dept,
      finalized: false,
      qualifiers: docs.map((d, i) => ({ ...d.toObject(), student: topAttempts[i].student }))
    });
  }

  return results;
}

/** Locks in the current draft qualification as final for one or all departments. */
async function finalizeRound2Qualification({ forRound = 2, departmentId = null, adminId = null } = {}) {
  const filter = { forRound, finalized: false };
  if (departmentId) filter.department = departmentId;

  const result = await Qualification.updateMany(filter, {
    $set: { finalized: true, resolvedBy: adminId }
  });
  return result;
}

/** Checks whether a given student is a finalized qualifier for a round. */
async function isQualifiedForRound(studentId, forRound) {
  const q = await Qualification.findOne({ student: studentId, forRound, finalized: true, qualified: true });
  return !!q;
}

module.exports = {
  computeRound2Qualification,
  finalizeRound2Qualification,
  isQualifiedForRound,
  compareAttempts
};
