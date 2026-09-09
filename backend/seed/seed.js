require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { hashPassword } = require('../utils/passwordHash');
const {
  University,
  AcademicSession,
  Faculty,
  Department,
  Programme,
  Semester,
  Subject,
  Admin,
  FacultyMember,
  Supervisor,
  Student,
} = require('../models');

async function seed() {
  await connectDB();
  console.log('[seed] Connected. Clearing existing seed-relevant collections...');

  await Promise.all([
    University.deleteMany({}),
    AcademicSession.deleteMany({}),
    Faculty.deleteMany({}),
    Department.deleteMany({}),
    Programme.deleteMany({}),
    Semester.deleteMany({}),
    Subject.deleteMany({}),
    Admin.deleteMany({}),
    FacultyMember.deleteMany({}),
    Supervisor.deleteMany({}),
    Student.deleteMany({}),
  ]);

  const university = await University.create({
    name: 'National Institute of Technology (Demo)',
    officialEmail: 'exams@university.edu',
    emailDomain: 'university.edu',
    contactNumber: '+91-0000000000',
    address: 'Demo Campus, Demo City',
    supportedLanguages: ['en', 'hi', 'pa', 'ta'],
  });

  const session = await AcademicSession.create({
    universityId: university._id,
    name: '2025-2026',
    startDate: new Date('2025-07-01'),
    endDate: new Date('2026-06-30'),
  });

  const faculty = await Faculty.create({
    universityId: university._id,
    name: 'Faculty of Engineering',
    code: 'ENG',
  });

  const department = await Department.create({
    universityId: university._id,
    facultyId: faculty._id,
    name: 'Department of Computer Science',
    code: 'CSE',
  });

  const programme = await Programme.create({
    universityId: university._id,
    departmentId: department._id,
    name: 'B.Tech Computer Science',
    code: 'BTCS',
    durationSemesters: 8,
  });

  const semester = await Semester.create({
    universityId: university._id,
    programmeId: programme._id,
    number: 3,
    academicSessionId: session._id,
  });

  const subject = await Subject.create({
    universityId: university._id,
    programmeId: programme._id,
    semesterId: semester._id,
    name: 'Data Structures',
    code: 'CS201',
  });

  const admin = await Admin.create({
    universityId: university._id,
    name: 'Examination Controller',
    email: 'admin@university.edu',
    passwordHash: await hashPassword('Admin@12345'),
    role: 'SUPER_ADMIN',
    permissions: ['PUBLISH_RESULTS', 'MANAGE_ELIGIBILITY', 'LOCK_PAPER', 'FINALIZE_RESULTS'],
  });

  const facultyMember = await FacultyMember.create({
    universityId: university._id,
    departmentId: department._id,
    name: 'Dr. Faculty Member',
    email: 'faculty@university.edu',
    passwordHash: await hashPassword('Faculty@12345'),
    permittedSubjectIds: [subject._id],
  });

  const supervisor = await Supervisor.create({
    universityId: university._id,
    name: 'Exam Supervisor',
    email: 'supervisor@university.edu',
    passwordHash: await hashPassword('Supervisor@12345'),
    permissions: ['VIEW_LIVE', 'FLAG_CANDIDATE'],
  });

  const studentDefs = [
    { name: 'Aarav Sharma', uid: 'U10001', universityEmail: 'aarav.sharma@university.edu' },
    { name: 'Priya Kaur', uid: 'U10002', universityEmail: 'priya.kaur@university.edu' },
    { name: 'Rohan Iyer', uid: 'U10003', universityEmail: 'rohan.iyer@university.edu' },
  ];

  const students = [];
  for (const def of studentDefs) {
    const student = await Student.create({
      universityId: university._id,
      name: def.name,
      uid: def.uid,
      universityEmail: def.universityEmail,
      phone: '+91-9000000000',
      passwordHash: await hashPassword('Student@12345'),
      emailVerified: true,
      accountStatus: 'ACTIVE',
      programmeId: programme._id,
      departmentId: department._id,
      semesterId: semester._id,
    });
    students.push(student);
  }

  console.log('[seed] Done.');
  console.log('---------------------------------------------------------');
  console.log('University:', university.name, university._id.toString());
  console.log('Admin login:      admin@university.edu / Admin@12345');
  console.log('Faculty login:    faculty@university.edu / Faculty@12345');
  console.log('Supervisor login: supervisor@university.edu / Supervisor@12345');
  console.log('Students (UID / password): U10001-U10003 / Student@12345');
  console.log('---------------------------------------------------------');
  console.log(
    'NOTE: Exam/Blueprint/Paper/Eligibility/Attempt/Result/Query seed data ' +
      'requires paperService.generatePaper() and paperService.lockPaper(), ' +
      'which are currently documented stubs (see services/paperService.js). ' +
      'Extend this script once those are implemented.'
  );

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
