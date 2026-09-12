const { Schema, model } = require('mongoose');
const { COMPETITION_TYPES } = require('../config/constants');

const scoringRuleSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    maxPoints: { type: Number, required: true, min: 0, max: 1000 }
  },
  { _id: true }
);

const competitionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, enum: Object.values(COMPETITION_TYPES), required: true, unique: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    date: { type: Date },
    venue: { type: String, trim: true, maxlength: 240, default: '' },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    schedule: {
      startsAt: { type: Date },
      endsAt: { type: Date },
      isPaused: { type: Boolean, default: false },
      pauseReason: { type: String, trim: true, maxlength: 240, default: '' }
    },
    scoringRules: { type: [scoringRuleSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
  },
  { timestamps: true }
);

module.exports = model('Competition', competitionSchema);
