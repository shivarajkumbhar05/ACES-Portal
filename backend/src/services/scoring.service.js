const Question = require('../models/Question');

/**
 * Recomputes and finalizes the score for an attempt directly from the
 * questions' correct answers stored in the database. The client-submitted
 * answers only ever indicate a *position* the student clicked - the actual
 * correctness is always resolved here, never trusted from the client.
 */
async function finalizeAttemptScore(attempt, round) {
  const questionIds = attempt.questions.map((q) => q.question);
  const questions = await Question.find({ _id: { $in: questionIds } }).lean();
  const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let score = 0;
  let maxScore = 0;

  attempt.questions.forEach((aq) => {
    maxScore += aq.marks;
    const master = questionMap.get(aq.question.toString());
    if (!master) return;

    if (aq.selectedPosition === null || aq.selectedPosition === undefined) {
      unanswered += 1;
      aq.isCorrect = null;
      return;
    }

    const selectedOptionKey = aq.optionOrder[aq.selectedPosition];
    const isCorrect = selectedOptionKey === master.correctAnswer;
    aq.isCorrect = isCorrect;

    if (isCorrect) {
      correct += 1;
      score += aq.marks;
    } else {
      wrong += 1;
      if (round.negativeMarking) {
        score -= round.negativeMarkingValue;
      }
    }
  });

  // Score should never go below zero even with negative marking.
  score = Math.max(0, score);

  attempt.correctAnswers = correct;
  attempt.wrongAnswers = wrong;
  attempt.unanswered = unanswered;
  attempt.attemptedQuestions = correct + wrong;
  attempt.score = Math.round(score * 100) / 100;
  attempt.maxScore = maxScore;
  attempt.percentage = maxScore > 0 ? Math.round((attempt.score / maxScore) * 10000) / 100 : 0;

  return attempt;
}

module.exports = { finalizeAttemptScore };
