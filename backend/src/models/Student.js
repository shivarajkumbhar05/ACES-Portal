const { Schema, model } = require('mongoose');

const studentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true, uppercase: true },
    phoneNumber: { type: String, trim: true, maxlength: 20, default: '' },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true }
  },
  { timestamps: true }
);

// A roll number is unique within a department (two departments could reuse a
// roll numbering scheme, but the same student record is reused across rounds).
studentSchema.index({ rollNumber: 1, department: 1 }, { unique: true });

module.exports = model('Student', studentSchema);
