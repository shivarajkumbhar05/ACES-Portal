const { Schema, model } = require('mongoose');
const { DIFFICULTIES } = require('../config/constants');

const questionSchema = new Schema(
  {
    round: { type: Schema.Types.ObjectId, ref: 'QuizRound', required: true },
    questionText: { type: String, required: true, trim: true },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true }
    },
    correctAnswer: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    category: { type: String, trim: true, default: 'General' },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'Medium' },
    marks: { type: Number, default: 1, min: 0 },
    isActive: { type: Boolean, default: true },
    // normalized text used to detect duplicates on upload
    normalizedText: { type: String, index: true }
  },
  { timestamps: true }
);

questionSchema.pre('validate', function normalize(next) {
  if (this.questionText) {
    this.normalizedText = this.questionText.trim().toLowerCase().replace(/\s+/g, ' ');
  }
  next();
});

// Never leak the correct answer to student-facing responses by default.
questionSchema.methods.toStudentJSON = function toStudentJSON() {
  return {
    id: this._id,
    questionText: this.questionText,
    options: this.options,
    marks: this.marks,
    category: this.category,
    difficulty: this.difficulty
  };
};

module.exports = model('Question', questionSchema);
