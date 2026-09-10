const { Schema, model } = require('mongoose');

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }
  },
  { timestamps: true }
);

module.exports = model('Department', departmentSchema);
