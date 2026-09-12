const { Schema, model } = require('mongoose');

const judgingScoreSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    competition: { type: Schema.Types.ObjectId, ref: 'Competition' },
    round: { type: Schema.Types.ObjectId, ref: 'QuizRound', required: true },
    roundNumber: { type: Number, required: true },
    judge: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    score: { type: Number, required: true, min: 0, max: 1000 },
    notes: { type: String, trim: true, maxlength: 2000, default: '' }
  },
  { timestamps: true }
);

judgingScoreSchema.index({ student: 1, competition: 1, judge: 1 }, { unique: true, sparse: true });
module.exports = model('JudgingScore', judgingScoreSchema);
