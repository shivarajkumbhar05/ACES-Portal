const XLSX = require('xlsx');
const { parse } = require('csv-parse/sync');
const { DIFFICULTIES } = require('../config/constants');

const REQUIRED_COLUMNS = [
  'Question',
  'Option A',
  'Option B',
  'Option C',
  'Option D',
  'Correct Answer',
  'Category',
  'Difficulty',
  'Marks'
];
const MAX_ROWS = 5000;
const MAX_QUESTION_LENGTH = 1000;
const MAX_OPTION_LENGTH = 300;
const MAX_CATEGORY_LENGTH = 100;

function normalizeHeader(h) {
  return String(h || '').trim();
}

function rowsFromCSV(buffer) {
  const text = buffer.toString('utf-8');
  return parse(text, { columns: true, skip_empty_lines: true, trim: true, max_records: MAX_ROWS + 1 });
}

function rowsFromXLSX(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: MAX_ROWS + 2 });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

/**
 * Parses a question-bank file buffer and returns a validation report.
 * Never returns "valid" rows that haven't individually passed every check -
 * the caller must still explicitly confirm before anything is inserted.
 */
function parseQuestionFile(buffer, mimetype, originalName) {
  let rawRows;
  const isCSV = mimetype.includes('csv') || originalName.toLowerCase().endsWith('.csv');

  try {
    rawRows = isCSV ? rowsFromCSV(buffer) : rowsFromXLSX(buffer);
  } catch (err) {
    return {
      fileValid: false,
      error: `Could not parse file: ${err.message}`,
      validRows: [],
      invalidRows: [],
      totalRows: 0
    };
  }

  if (!rawRows.length) {
    return {
      fileValid: false,
      error: 'File contains no data rows.',
      validRows: [],
      invalidRows: [],
      totalRows: 0
    };
  }

  if (rawRows.length > MAX_ROWS) {
    return {
      fileValid: false,
      error: `File contains too many rows. The maximum is ${MAX_ROWS}.`,
      validRows: [],
      invalidRows: [],
      totalRows: rawRows.length
    };
  }

  const headerKeys = Object.keys(rawRows[0]).map(normalizeHeader);
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headerKeys.includes(col));
  if (missingColumns.length) {
    return {
      fileValid: false,
      error: `Missing required column(s): ${missingColumns.join(', ')}`,
      validRows: [],
      invalidRows: [],
      totalRows: rawRows.length
    };
  }

  const validRows = [];
  const invalidRows = [];
  const seenInFile = new Set();

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // account for header row, 1-indexed
    const errors = [];

    const questionText = String(row['Question'] || '').trim();
    const a = String(row['Option A'] || '').trim();
    const b = String(row['Option B'] || '').trim();
    const c = String(row['Option C'] || '').trim();
    const d = String(row['Option D'] || '').trim();
    const correctRaw = String(row['Correct Answer'] || '').trim().toUpperCase();
    const category = String(row['Category'] || 'General').trim() || 'General';
    const difficultyRaw = String(row['Difficulty'] || 'Medium').trim();
    const difficulty = DIFFICULTIES.find((d2) => d2.toLowerCase() === difficultyRaw.toLowerCase()) || null;
    const marksRaw = row['Marks'];
    const marks = Number(marksRaw);

    if (!questionText) errors.push('Question text is empty');
    if (!a || !b || !c || !d) errors.push('One or more options (A-D) is empty');
    if (questionText.length > MAX_QUESTION_LENGTH) errors.push(`Question text must be ${MAX_QUESTION_LENGTH} characters or fewer`);
    if ([a, b, c, d].some((option) => option.length > MAX_OPTION_LENGTH)) errors.push(`Options must be ${MAX_OPTION_LENGTH} characters or fewer`);
    if (category.length > MAX_CATEGORY_LENGTH) errors.push(`Category must be ${MAX_CATEGORY_LENGTH} characters or fewer`);
    if (!['A', 'B', 'C', 'D'].includes(correctRaw)) {
      errors.push('Correct Answer must be A, B, C or D');
    }
    if (!difficulty) errors.push(`Difficulty must be one of: ${DIFFICULTIES.join(', ')}`);
    if (!Number.isFinite(marks) || marks <= 0) errors.push('Marks must be a positive number');

    const normalized = questionText.toLowerCase().replace(/\s+/g, ' ');
    if (normalized && seenInFile.has(normalized)) {
      errors.push('Duplicate question within this file');
    }

    if (errors.length) {
      invalidRows.push({ rowNumber, reasons: errors, raw: row });
      return;
    }

    seenInFile.add(normalized);
    validRows.push({
      rowNumber,
      questionText,
      options: { A: a, B: b, C: c, D: d },
      correctAnswer: correctRaw,
      category,
      difficulty,
      marks,
      normalizedText: normalized
    });
  });

  return {
    fileValid: true,
    error: null,
    validRows,
    invalidRows,
    totalRows: rawRows.length
  };
}

/** Generates the downloadable CSV template admins can fill in. */
function buildTemplateCSV() {
  const header = REQUIRED_COLUMNS.join(',');
  const example = [
    'What does CPU stand for?',
    'Central Processing Unit',
    'Computer Personal Unit',
    'Control Processing Unit',
    'Central Program Unit',
    'A',
    'Computer',
    'Easy',
    '1'
  ]
    .map((v) => `"${v.replace(/"/g, '""')}"`)
    .join(',');
  return `${header}\n${example}\n`;
}

module.exports = { parseQuestionFile, buildTemplateCSV, REQUIRED_COLUMNS };
