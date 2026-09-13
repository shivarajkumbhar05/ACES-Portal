const { Schema, model } = require('mongoose');

const attendanceAssignmentSchema = new Schema(
  {
    competition: { type: Schema.Types.ObjectId, ref: 'Competition', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    volunteer: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    judges: [{ type: Schema.Types.ObjectId, ref: 'Admin' }],
    phoneNumber: { type: String, trim: true, maxlength: 20, default: '' },
    status: { type: String, enum: ['assigned', 'checked_in'], default: 'assigned' },
    checkInToken: { type: String, unique: true, sparse: true },
    checkedInAt: { type: Date, default: null },
    isLate: { type: Boolean, default: false }
  },
  { timestamps: true }
);

attendanceAssignmentSchema.index({ competition: 1, student: 1 }, { unique: true });
module.exports = model('AttendanceAssignment', attendanceAssignmentSchema);
