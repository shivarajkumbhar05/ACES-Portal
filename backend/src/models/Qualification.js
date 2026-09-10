const { Schema, model } = require('mongoose');

const qualificationSchema = new Schema(
  {
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    fromRound: { type: Number, required: true, default: 1 },
    forRound: { type: Number, required: true, default: 2 },

    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    attempt: { type: Schema.Types.ObjectId, ref: 'Attempt', required: true },

    rank: { type: Number, required: true },
    score: { type: Number, required: true },
    timeTakenSeconds: { type: Number, required: true },

    qualified: { type: Boolean, default: true },
    tieBreakReason: { type: String, default: null },
    manuallyResolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },

    finalized: { type: Boolean, default: false },
    hasAttemptedNextRound: { type: Boolean, default: false }
  },
  { timestamps: true }
);

qualificationSchema.index(
  { department: 1, forRound: 1, student: 1 },
  { unique: true }
);

module.exports = model('Qualification', qualificationSchema);
