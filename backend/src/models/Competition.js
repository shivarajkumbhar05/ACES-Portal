const { Schema, model } = require('mongoose');

const competitionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    date: { type: Date },
    venue: { type: String, trim: true, maxlength: 240, default: '' },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
  },
  { timestamps: true }
);

module.exports = model('Competition', competitionSchema);
