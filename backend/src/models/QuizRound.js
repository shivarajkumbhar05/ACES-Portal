const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROUND_STATUS, ROUND_TYPES } = require('../config/constants');

const quizRoundSchema = new Schema(
  {
    roundNumber: { type: Number, required: true, unique: true, min: 1, max: 3 },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(ROUND_TYPES), default: ROUND_TYPES.QUIZ },

    questionsPerQuiz: { type: Number, default: 30, min: 1 },
    timeLimitMinutes: { type: Number, default: 30, min: 1 },
    marksPerQuestion: { type: Number, default: 1, min: 0 },

    negativeMarking: { type: Boolean, default: false },
    negativeMarkingValue: { type: Number, default: 0, min: 0 },

    randomizeQuestions: { type: Boolean, default: true },
    randomizeOptions: { type: Boolean, default: true },

    maxAttempts: { type: Number, default: 1, min: 1 },

    examCodeHash: { type: String, required: true },

    showCorrectAnswers: { type: Boolean, default: false },
    showScoreToStudent: { type: Boolean, default: true },
    showLeaderboardToStudents: { type: Boolean, default: false },

    // Only relevant for round 2, but kept generic
    participantLimit: { type: Number, default: null }, // e.g. 20 for round 2

    status: {
      type: String,
      enum: Object.values(ROUND_STATUS),
      default: ROUND_STATUS.DRAFT
    },

    qualificationFinalized: { type: Boolean, default: false },

    startedAt: { type: Date },
    endedAt: { type: Date }
  },
  { timestamps: true }
);

quizRoundSchema.methods.setExamCode = async function setExamCode(plainCode) {
  const salt = await bcrypt.genSalt(10);
  this.examCodeHash = await bcrypt.hash(plainCode.trim(), salt);
};

quizRoundSchema.methods.verifyExamCode = async function verifyExamCode(plainCode) {
  if (!plainCode) return false;
  return bcrypt.compare(plainCode.trim(), this.examCodeHash);
};

// Never send the exam code hash to the client.
quizRoundSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.examCodeHash;
  return obj;
};

module.exports = model('QuizRound', quizRoundSchema);
