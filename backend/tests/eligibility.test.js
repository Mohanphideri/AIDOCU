const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { University, Student } = require('../models');
const eligibilityService = require('../services/eligibilityService');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

describe('eligibilityService.validateEligibilityCsv', () => {
  it('correctly classifies valid, duplicate, and unknown UIDs', async () => {
    const university = await University.create({
      name: 'Test University',
      officialEmail: 'exams@test.edu',
      emailDomain: 'test.edu',
    });

    await Student.create({
      universityId: university._id,
      name: 'Known Student',
      uid: 'U10001',
      universityEmail: 'known@test.edu',
      phone: '1234567890',
      passwordHash: 'x',
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });

    const rows = [
      { uid: 'U10001', rowNumber: 2 }, // valid
      { uid: 'U10001', rowNumber: 3 }, // duplicate
      { uid: 'U99999', rowNumber: 4 }, // unknown
    ];

    const result = await eligibilityService.validateEligibilityCsv({ universityId: university._id, rows });

    expect(result.totalRows).toBe(3);
    expect(result.validCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.unknownCount).toBe(1);
    expect(result.unknown[0].reason).toBe('Unknown UID');
  });

  it('never creates a student from an unknown UID', async () => {
    const university = await University.create({
      name: 'Test University',
      officialEmail: 'exams@test.edu',
      emailDomain: 'test.edu',
    });

    await eligibilityService.validateEligibilityCsv({
      universityId: university._id,
      rows: [{ uid: 'U55555', rowNumber: 2 }],
    });

    const count = await Student.countDocuments({ uid: 'U55555' });
    expect(count).toBe(0);
  });
});
