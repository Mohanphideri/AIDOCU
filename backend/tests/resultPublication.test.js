const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Exam, Result, University, AcademicSession, Faculty, Department, Programme, Semester, Subject, Admin, Student } = require('../models');
const resultService = require('../services/resultService');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function buildExamAndResult(overrides = {}) {
  const university = await University.create({ name: 'U', officialEmail: 'e@test.edu', emailDomain: 'test.edu' });
  const session = await AcademicSession.create({ universityId: university._id, name: '2025', startDate: new Date(), endDate: new Date() });
  const faculty = await Faculty.create({ universityId: university._id, name: 'F', code: 'F1' });
  const department = await Department.create({ universityId: university._id, facultyId: faculty._id, name: 'D', code: 'D1' });
  const programme = await Programme.create({ universityId: university._id, departmentId: department._id, name: 'P', code: 'P1', durationSemesters: 8 });
  const semester = await Semester.create({ universityId: university._id, programmeId: programme._id, number: 1, academicSessionId: session._id });
  const subject = await Subject.create({ universityId: university._id, programmeId: programme._id, semesterId: semester._id, name: 'S', code: 'S1' });
  const admin = await Admin.create({ universityId: university._id, name: 'A', email: 'a@test.edu', passwordHash: 'x' });
  const student = await Student.create({
    universityId: university._id, name: 'St', uid: 'U1', universityEmail: 'st@test.edu', phone: '123',
    passwordHash: 'x', emailVerified: true, accountStatus: 'ACTIVE',
  });

  const exam = await Exam.create({
    universityId: university._id, academicSessionId: session._id, facultyId: faculty._id, departmentId: department._id,
    programmeId: programme._id, semesterId: semester._id, subjectId: subject._id, subjectCode: 'S1', examType: 'MID_SEM',
    examDate: new Date(), startTime: new Date(), endTime: new Date(), durationMinutes: 60, maximumMarks: 100, passingMarks: 40,
    status: overrides.examStatus || 'CLOSED', createdBy: admin._id,
  });

  const result = await Result.create({
    examId: exam._id, studentId: student._id, attemptId: new mongoose.Types.ObjectId(),
    maximumMarks: 100, obtainedMarks: 80, percentage: 80, grade: 'A', passFail: 'PASS',
    status: overrides.resultStatus || 'FINALIZED',
  });

  return { exam, result, admin, student };
}

describe('resultService.publishResults', () => {
  it('refuses to publish if the exam is not CLOSED', async () => {
    const { exam, admin } = await buildExamAndResult({ examStatus: 'ACTIVE' });
    await expect(
      resultService.publishResults({ examId: exam._id, adminId: admin._id, resultPortalBaseUrl: 'http://x' })
    ).rejects.toThrow(/closed/i);
  });

  it('refuses to publish if there are no finalized results', async () => {
    const { exam, admin } = await buildExamAndResult({ resultStatus: 'DRAFT' });
    await expect(
      resultService.publishResults({ examId: exam._id, adminId: admin._id, resultPortalBaseUrl: 'http://x' })
    ).rejects.toThrow(/no finalized/i);
  });

  it('a student cannot see a result that is only FINALIZED, not PUBLISHED', async () => {
    const { result, student } = await buildExamAndResult({ resultStatus: 'FINALIZED' });
    await expect(
      resultService.getResultForStudent({ resultId: result._id, studentId: student._id })
    ).rejects.toThrow(/not yet been published/i);
  });
});
