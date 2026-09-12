const { Schema, model } = require('mongoose');

const rubricScoreSchema = new Schema(
  {
    ruleId: { type: Schema.Types.ObjectId, required: true },
    label: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 0, max: 1000 }
  },
  { _id: false }
);

const judgingScoreSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    competition: { type: Schema.Types.ObjectId, ref: 'Competition' },
    round: { type: Schema.Types.ObjectId, ref: 'QuizRound' },
    roundNumber: { type: Number },
    judge: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    score: { type: Number, required: true, min: 0, max: 1000 },
    rubricScores: { type: [rubricScoreSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 2000, default: '' }
    ,status: { type: String, enum: ['draft', 'submitted', 'locked', 'approved', 'rejected'], default: 'draft' }
    ,submittedAt: { type: Date, default: null }
    ,lockedAt: { type: Date, default: null }
    ,approvedAt: { type: Date, default: null }
    ,approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null }
  },
  { timestamps: true }
);

judgingScoreSchema.index({ student: 1, competition: 1, judge: 1 }, { unique: true, sparse: true });
module.exports = model('JudgingScore', judgingScoreSchema);
