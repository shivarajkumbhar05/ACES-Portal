const { Types } = require('mongoose');

function isValidObjectId(id) {
  return typeof id === 'string' && Types.ObjectId.isValid(id);
}

function isNonEmptyString(value, maxLen = 500) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLen;
}

function isRollNumber(value) {
  return typeof value === 'string' && /^[A-Za-z0-9\-\/]{1,30}$/.test(value.trim());
}

function isOptionKey(value) {
  return ['A', 'B', 'C', 'D'].includes(value);
}

/** Strips characters that have no business in a plain display string. */
function sanitizeText(value) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').trim() : value;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  isValidObjectId,
  isNonEmptyString,
  isRollNumber,
  isOptionKey,
  sanitizeText,
  escapeRegex
};
