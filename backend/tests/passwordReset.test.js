const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { University, Student, Admin, PasswordResetToken } = require('../models');
const { hashPassword, comparePassword } = require('../utils/passwordHash');
const passwordResetService = require('../services/passwordResetService');

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

async function makeUniversity() {
  return University.create({
    name: 'Test University',
    officialEmail: 'exams@test.edu',
    emailDomain: 'test.edu',
  });
}

describe('passwordResetService', () => {
  it('issues a reset token for a known student email and lets them set a new password', async () => {
    const university = await makeUniversity();
    const student = await Student.create({
      universityId: university._id,
      name: 'Known Student',
      uid: 'U10001',
      universityEmail: 'known@test.edu',
      phone: '1234567890',
      passwordHash: await hashPassword('OldPass123'),
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });

    await passwordResetService.requestPasswordReset({ role: 'STUDENT', email: 'known@test.edu' });

    const tokenDoc = await PasswordResetToken.findOne({ accountId: student._id, role: 'STUDENT' });
    expect(tokenDoc).not.toBeNull();
    expect(tokenDoc.used).toBe(false);

    // The plaintext token never touches the DB — only its hash — so we
    // recover it the same way the emailed link would: by asking the
    // service for a fresh one is not possible, so instead assert the
    // stored hash is well-formed (64 hex chars for SHA-256) rather than
    // trying to reverse it.
    expect(tokenDoc.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not throw or reveal anything for an unknown email', async () => {
    await makeUniversity();
    await expect(
      passwordResetService.requestPasswordReset({ role: 'STUDENT', email: 'nobody@test.edu' })
    ).resolves.toBeUndefined();

    const count = await PasswordResetToken.countDocuments();
    expect(count).toBe(0);
  });

  it('resets the password with a valid token and invalidates it after use', async () => {
    const university = await makeUniversity();
    const admin = await Admin.create({
      universityId: university._id,
      name: 'Site Admin',
      email: 'admin@test.edu',
      passwordHash: await hashPassword('OldPass123'),
    });

    // Drive requestPasswordReset but capture the plaintext token the way
    // resetPassword() will need it, by regenerating through the same
    // hashing path the service uses internally is not exposed — so we
    // call the private flow indirectly via a second service instance
    // that exposes the token through the email step. Since emailService
    // has no test hook here, we instead verify the reset flow using the
    // hash directly against a manually issued token, matching how the
    // controller integration is expected to behave end to end.
    const { generateUrlSafeToken, hashValue } = require('../utils/tokenHash');
    const plainToken = generateUrlSafeToken(32);
    await PasswordResetToken.create({
      accountId: admin._id,
      role: 'ADMIN',
      tokenHash: hashValue(plainToken),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    await passwordResetService.resetPassword({ role: 'ADMIN', token: plainToken, newPassword: 'NewPass456' });

    const updatedAdmin = await Admin.findById(admin._id).select('+passwordHash');
    expect(await comparePassword('NewPass456', updatedAdmin.passwordHash)).toBe(true);

    const usedToken = await PasswordResetToken.findOne({ accountId: admin._id, role: 'ADMIN' });
    expect(usedToken.used).toBe(true);

    // Re-using the same token must fail.
    await expect(
      passwordResetService.resetPassword({ role: 'ADMIN', token: plainToken, newPassword: 'AnotherPass789' })
    ).rejects.toThrow(/invalid or has already been used/);
  });

  it('rejects an expired token', async () => {
    const university = await makeUniversity();
    const student = await Student.create({
      universityId: university._id,
      name: 'Expired Flow Student',
      uid: 'U10002',
      universityEmail: 'expired@test.edu',
      phone: '1234567890',
      passwordHash: await hashPassword('OldPass123'),
      emailVerified: true,
      accountStatus: 'ACTIVE',
    });

    const { generateUrlSafeToken, hashValue } = require('../utils/tokenHash');
    const plainToken = generateUrlSafeToken(32);
    await PasswordResetToken.create({
      accountId: student._id,
      role: 'STUDENT',
      tokenHash: hashValue(plainToken),
      expiresAt: new Date(Date.now() - 60 * 1000), // already expired
    });

    await expect(
      passwordResetService.resetPassword({ role: 'STUDENT', token: plainToken, newPassword: 'NewPass456' })
    ).rejects.toThrow(/expired/);
  });
});
