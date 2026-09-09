const mongoose = require('mongoose');
const { Schema } = mongoose;

const EXAM_STATUSES = ['DRAFT', 'READY', 'SCHEDULED', 'ACTIVE', 'CLOSED'];
const RESULT_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'FINALIZED', 'PUBLISHED'];

// Valid forward transitions for the exam lifecycle. Enforced in examService,
// not just documented here — see services/examService.js.
const EXAM_TRANSITIONS = {
  DRAFT: ['READY'],
  READY: ['SCHEDULED', 'DRAFT'],
  SCHEDULED: ['ACTIVE', 'READY'],
  ACTIVE: ['CLOSED'],
  CLOSED: [],
};

const ExamSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    academicSessionId: { type: Schema.Types.ObjectId, ref: 'AcademicSession', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    programmeId: { type: Schema.Types.ObjectId, ref: 'Programme', required: true },
    semesterId: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    subjectCode: { type: String, required: true, trim: true, uppercase: true },

    examType: { type: String, required: true, trim: true }, // e.g. MID_SEM, END_SEM, QUIZ

    examDate: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1 },

    maximumMarks: { type: Number, required: true, min: 1 },
    passingMarks: { type: Number, required: true, min: 0 },

    instructions: { type: String, default: '' },
    supportedLanguages: {
      type: [String],
      default: ['en'],
      validate: {
        validator: (arr) => arr.every((l) => ['en', 'hi', 'pa', 'ta'].includes(l)),
        message: 'Unsupported language code',
      },
    },

    randomization: {
      randomizeQuestionOrder: { type: Boolean, default: false },
      randomizeOptionOrder: { type: Boolean, default: false },
    },

    proctoringSettings: {
      requireCamera: { type: Boolean, default: true },
      requireMicrophone: { type: Boolean, default: true },
      requireFullscreen: { type: Boolean, default: true },
      fullscreenAutoSubmitThreshold: { type: Number, default: 3 },
      recordingEnabled: { type: Boolean, default: false },
    },

    queryDeadlineHoursAfterExam: { type: Number, default: 24 },

    status: { type: String, enum: EXAM_STATUSES, default: 'DRAFT', index: true },
    resultStatus: { type: String, enum: RESULT_STATUSES, default: 'DRAFT', index: true },

    lockedPaperId: { type: Schema.Types.ObjectId, ref: 'Paper', default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true }
);

ExamSchema.statics.EXAM_STATUSES = EXAM_STATUSES;
ExamSchema.statics.RESULT_STATUSES = RESULT_STATUSES;
ExamSchema.statics.EXAM_TRANSITIONS = EXAM_TRANSITIONS;

module.exports = mongoose.model('Exam', ExamSchema);
