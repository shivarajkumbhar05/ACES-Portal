const { Schema, model } = require('mongoose');

const attendanceSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    round: { type: Schema.Types.ObjectId, ref: 'QuizRound', required: true },
    roundNumber: { type: Number, required: true },
    volunteer: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    phoneNumber: { type: String, trim: true, maxlength: 20, required: true },
    present: { type: Boolean, default: true },
    checkedInAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, round: 1 }, { unique: true });
module.exports = model('Attendance', attendanceSchema);
