const XLSX = require('xlsx');
const questionController = require('../controllers/questionController');

function buildRow(overrides = {}) {
  return {
    questionText: 'What is 2 + 2?',
    optionA: '3',
    optionB: '4',
    optionC: '5',
    optionD: '6',
    correctAnswer: 'B',
    marks: '2',
    difficulty: 'EASY',
    unit: 'Arithmetic',
    topic: 'Addition',
    explanation: 'Basic addition',
    reference: 'Ch1',
    tags: 'math,basic',
    ...overrides,
  };
}

function csvEscape(value) {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildCsvBuffer(rows) {
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  });
  return Buffer.from(lines.join('\n'), 'utf-8');
}

function buildXlsxBuffer(rows) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

async function runPreview(file) {
  const req = { file };
  const res = mockRes();
  const next = jest.fn((err) => {
    if (err) throw err;
  });
  await questionController.previewImport(req, res, next);
  expect(next).not.toHaveBeenCalled();
  // apiResponse.success calls res.status(code).json({ success, message, data })
  const jsonArg = res.json.mock.calls[0][0];
  return jsonArg.data;
}

describe('questionController.previewImport — CSV and XLSX parity', () => {
  const rows = [buildRow(), buildRow({ questionText: 'Capital of France?', correctAnswer: 'A', optionA: 'Paris', optionB: 'Rome', optionC: 'Berlin', optionD: 'Madrid', marks: '1' })];

  it('parses a CSV upload into the expected preview shape', async () => {
    const preview = await runPreview({
      originalname: 'questions.csv',
      mimetype: 'text/csv',
      buffer: buildCsvBuffer(rows),
    });

    expect(preview.totalRows).toBe(2);
    expect(preview.validCount).toBe(2);
    expect(preview.invalidCount).toBe(0);
    expect(preview.valid[0]).toMatchObject({
      questionText: 'What is 2 + 2?',
      correctAnswer: 'B',
      marks: 2,
      options: { A: '3', B: '4', C: '5', D: '6' },
    });
  });

  it('parses an XLSX upload into the same shape the CSV path produces', async () => {
    const preview = await runPreview({
      originalname: 'questions.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: buildXlsxBuffer(rows),
    });

    expect(preview.totalRows).toBe(2);
    expect(preview.validCount).toBe(2);
    expect(preview.invalidCount).toBe(0);
    expect(preview.valid[0]).toMatchObject({
      questionText: 'What is 2 + 2?',
      correctAnswer: 'B',
      marks: 2,
      options: { A: '3', B: '4', C: '5', D: '6' },
    });
    expect(Object.keys(preview.valid[0]).sort()).toEqual(
      Object.keys((await runPreview({
        originalname: 'questions.csv',
        mimetype: 'text/csv',
        buffer: buildCsvBuffer(rows),
      })).valid[0]).sort()
    );
  });

  it('detects xlsx by extension even with a generic mimetype', async () => {
    const preview = await runPreview({
      originalname: 'questions.xlsx',
      mimetype: 'application/octet-stream',
      buffer: buildXlsxBuffer(rows),
    });
    expect(preview.validCount).toBe(2);
  });

  it('rejects an empty workbook the same way an empty CSV is rejected', async () => {
    const emptySheet = XLSX.utils.aoa_to_sheet([]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, emptySheet, 'Sheet1');

    const req = {
      file: {
        originalname: 'empty.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
      },
    };

    const res = mockRes();
    const next = jest.fn();
    await questionController.previewImport(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });
});
