const { Schema, model } = require('mongoose');
const { ATTEMPT_STATUS } = require('../config/constants');

// One entry per question served to this student in this attempt.
// optionOrder stores the shuffled display order as the ORIGINAL option keys,
// e.g. ["C","A","D","B"] means the option shown first ("position 0") is
// actually option C in the master question document. This lets us randomize
// the display without ever storing/duplicating the correct answer text.
const attemptQuestionSchema = new Schema(
  {
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    order: { type: Number, required: true }, // position within the attempt (0-indexed)
    optionOrder: { type: [String], required: true }, // e.g. ['B','A','D','C']
    marks: { type: Number, required: true },

    selectedPosition: { type: Number, default: null }, // 0-3, index into optionOrder
    flagged: { type: Boolean, default: false },
    isCorrect: { type: Boolean, default: null },
    answeredAt: { type: Date, default: null }
  },
  { _id: false }
);

const attemptSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    round: { type: Schema.Types.ObjectId, ref: 'QuizRound', required: true },
    roundNumber: { type: Number, required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },

    questions: { type: [attemptQuestionSchema], default: [] },

    status: {
      type: String,
      enum: Object.values(ATTEMPT_STATUS),
      default: ATTEMPT_STATUS.IN_PROGRESS
    },

    startedAt: { type: Date, required: true, default: Date.now },
    deadlineAt: { type: Date, required: true }, // startedAt + timeLimit, server authoritative
    submittedAt: { type: Date, default: null },
    timeTakenSeconds: { type: Number, default: null },

    totalQuestions: { type: Number, required: true },
    attemptedQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    unanswered: { type: Number, default: 0 },

    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },

    ipAddress: { type: String },
    userAgent: { type: String },
    violationCount: { type: Number, default: 0 },
    violationReason: { type: String, default: null },
    violationAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Enforce "one attempt per student per round" at the database level.
attemptSchema.index({ student: 1, round: 1 }, { unique: true });
attemptSchema.index({ round: 1, department: 1, score: -1, timeTakenSeconds: 1, submittedAt: 1 });

module.exports = model('Attempt', attemptSchema);
