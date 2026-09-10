const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  Exam, ExamBlueprint, Paper, University, AcademicSession, Faculty, Department, Programme, Semester, Subject, Admin,
} = require('../models');
const blueprintService = require('../services/blueprintService');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function buildExamWithBlueprint() {
  const university = await University.create({ name: 'U', officialEmail: 'e@test.edu', emailDomain: 'test.edu' });
  const session = await AcademicSession.create({ universityId: university._id, name: '2025', startDate: new Date(), endDate: new Date() });
  const faculty = await Faculty.create({ universityId: university._id, name: 'F', code: 'F1' });
  const department = await Department.create({ universityId: university._id, facultyId: faculty._id, name: 'D', code: 'D1' });
  const programme = await Programme.create({ universityId: university._id, departmentId: department._id, name: 'P', code: 'P1', durationSemesters: 8 });
  const semester = await Semester.create({ universityId: university._id, programmeId: programme._id, number: 1, academicSessionId: session._id });
  const subject = await Subject.create({ universityId: university._id, programmeId: programme._id, semesterId: semester._id, name: 'S', code: 'S1' });
  const admin = await Admin.create({ universityId: university._id, name: 'A', email: 'a@test.edu', passwordHash: 'x' });

  const exam = await Exam.create({
    universityId: university._id, academicSessionId: session._id, facultyId: faculty._id, departmentId: department._id,
    programmeId: programme._id, semesterId: semester._id, subjectId: subject._id, subjectCode: 'S1', examType: 'MID_SEM',
    examDate: new Date(), startTime: new Date(), endTime: new Date(), durationMinutes: 60, maximumMarks: 100, passingMarks: 40,
    status: 'DRAFT', createdBy: admin._id,
  });

  const blueprint = await ExamBlueprint.create({
    examId: exam._id,
    sections: [{ name: 'Section A', questionCount: 5, marksPerQuestion: 1 }],
    createdBy: admin._id,
  });

  return { exam, blueprint, admin };
}

describe('blueprintService.updateBlueprint', () => {
  it('updates the sections and writes an audit entry', async () => {
    const { blueprint, admin } = await buildExamWithBlueprint();

    const updated = await blueprintService.updateBlueprint(
      blueprint._id,
      [{ name: 'Section A', questionCount: 10, marksPerQuestion: 2 }],
      admin._id
    );

    expect(updated.sections[0].questionCount).toBe(10);
    expect(updated.sections[0].marksPerQuestion).toBe(2);
  });

  it('refuses to update a blueprint that is locked to a LOCKED paper', async () => {
    const { exam, blueprint, admin } = await buildExamWithBlueprint();

    await Paper.create({
      examId: exam._id,
      blueprintId: blueprint._id,
      blueprintSnapshot: blueprint.toObject(),
      generationMode: 'AUTOMATIC',
      status: 'LOCKED',
      totalMarks: 5,
      totalQuestions: 5,
      lockedAt: new Date(),
      lockedBy: admin._id,
      createdBy: admin._id,
    });

    await expect(
      blueprintService.updateBlueprint(
        blueprint._id,
        [{ name: 'Section A', questionCount: 10, marksPerQuestion: 2 }],
        admin._id
      )
    ).rejects.toThrow(/locked/i);
  });

  it('still allows updates when a paper exists but is not LOCKED', async () => {
    const { exam, blueprint, admin } = await buildExamWithBlueprint();

    await Paper.create({
      examId: exam._id,
      blueprintId: blueprint._id,
      blueprintSnapshot: blueprint.toObject(),
      generationMode: 'AUTOMATIC',
      status: 'DRAFT',
      totalMarks: 5,
      totalQuestions: 5,
      createdBy: admin._id,
    });

    const updated = await blueprintService.updateBlueprint(
      blueprint._id,
      [{ name: 'Section A', questionCount: 8, marksPerQuestion: 1 }],
      admin._id
    );
    expect(updated.sections[0].questionCount).toBe(8);
  });
});
