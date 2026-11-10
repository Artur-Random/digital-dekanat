-- CreateEnum
CREATE TYPE "EducationLevelCode" AS ENUM ('BACHELOR', 'SPECIALIST', 'MASTER', 'SPECIALIZED_MASTER', 'BASIC_HE', 'SPO', 'POSTGRAD', 'ASSISTANTSHIP');

-- CreateEnum
CREATE TYPE "ControlForm" AS ENUM ('EXAM', 'DIFF_CREDIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "GradeValue" AS ENUM ('EXCELLENT', 'GOOD', 'SATISFACTORY', 'UNSATISFACTORY', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "UnitCode" AS ENUM ('MFC', 'DEKANAT', 'MILITARY');

-- CreateEnum
CREATE TYPE "StudyForm" AS ENUM ('FULL_TIME', 'PART_TIME', 'EXTRAMURAL');

-- CreateEnum
CREATE TYPE "Funding" AS ENUM ('BUDGET', 'CONTRACT');

-- CreateEnum
CREATE TYPE "RuleTrigger" AS ENUM ('DEBT_STAGE_1', 'DEBT_STAGE_2', 'GRADE_SATISFACTORY', 'NO_SHOW', 'ABSENCE_NOTICE');

-- CreateEnum
CREATE TYPE "HolidayKind" AS ENUM ('PUBLIC_HOLIDAY', 'TRANSFERRED_DAY_OFF');

-- CreateEnum
CREATE TYPE "ScheduleEventType" AS ENUM ('LECTURE', 'SEMINAR', 'CREDIT', 'EXAM', 'RETAKE_1', 'RETAKE_2');

-- CreateEnum
CREATE TYPE "DeliveryFormat" AS ENUM ('OFFLINE', 'ONLINE');

-- CreateEnum
CREATE TYPE "ScheduleChangeField" AS ENUM ('START_TIME', 'ROOM', 'TEACHER', 'FORMAT');

-- CreateEnum
CREATE TYPE "DebtStage" AS ENUM ('STAGE_1', 'STAGE_2');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('OPEN', 'LIQUIDATED');

-- CreateEnum
CREATE TYPE "ApplicationTypeCode" AS ENUM ('CERT_ENROLLMENT', 'CERT_GRADES', 'CERT_SUMMONS', 'CERT_MILITARY', 'PA_EXTENSION', 'ACADEMIC_LEAVE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'READY', 'UNDER_REVIEW', 'SENT_TO_COMMISSION', 'APPROVED', 'REJECTED', 'ORDER_SIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SCHEDULE_CHANGE', 'RETAKE', 'APPLICATION_STATUS', 'DEADLINE', 'ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "EducationLevel" (
    "id" TEXT NOT NULL,
    "code" "EducationLevelCode" NOT NULL,
    "name" TEXT NOT NULL,
    "rulesFilled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EducationLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeBand" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "controlForm" "ControlForm" NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "grade" "GradeValue" NOT NULL,
    "isPositive" BOOLEAN NOT NULL,
    "normCode" TEXT NOT NULL,

    CONSTRAINT "GradeBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationType" (
    "id" TEXT NOT NULL,
    "code" "ApplicationTypeCode" NOT NULL,
    "title" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "isInformational" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "stages" JSONB NOT NULL,
    "formFields" JSONB NOT NULL,
    "requiredDocuments" JSONB NOT NULL,
    "normCodes" TEXT[],

    CONSTRAINT "ApplicationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "trigger" "RuleTrigger" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "normCodes" TEXT[],

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Norm" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "clause" TEXT NOT NULL,
    "page" TEXT,
    "quote" TEXT NOT NULL,

    CONSTRAINT "Norm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kind" "HolidayKind" NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "code" "UnitCode" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "institute" TEXT NOT NULL,
    "programCode" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "studyForm" "StudyForm" NOT NULL,
    "funding" "Funding" NOT NULL,
    "course" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "course" INTEGER NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discipline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEvent" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "studentId" TEXT,
    "disciplineId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "roomId" TEXT,
    "platform" TEXT,
    "format" "DeliveryFormat" NOT NULL DEFAULT 'OFFLINE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "type" "ScheduleEventType" NOT NULL,

    CONSTRAINT "ScheduleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleChange" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "field" "ScheduleChangeField" NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "controlForm" "ControlForm" NOT NULL,
    "score" INTEGER,
    "grade" "GradeValue",
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicDebt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "formedAt" DATE NOT NULL,
    "stage" "DebtStage" NOT NULL,
    "deadline" DATE NOT NULL,
    "status" "DebtStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "AcademicDebt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "formData" JSONB NOT NULL,
    "unitId" TEXT NOT NULL,
    "stageDeadline" DATE,
    "willBringOriginal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "comment" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ApplicationTypeToEducationLevel" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ApplicationTypeToEducationLevel_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "EducationLevel_code_key" ON "EducationLevel"("code");

-- CreateIndex
CREATE INDEX "GradeBand_levelId_idx" ON "GradeBand"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeBand_levelId_controlForm_grade_key" ON "GradeBand"("levelId", "controlForm", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationType_code_key" ON "ApplicationType"("code");

-- CreateIndex
CREATE INDEX "ApplicationType_unitId_idx" ON "ApplicationType"("unitId");

-- CreateIndex
CREATE INDEX "Rule_levelId_trigger_idx" ON "Rule"("levelId", "trigger");

-- CreateIndex
CREATE UNIQUE INDEX "Norm_code_key" ON "Norm"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_login_createdAt_idx" ON "LoginAttempt"("login", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE INDEX "StaffProfile_unitId_idx" ON "StaffProfile"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_levelId_idx" ON "StudentProfile"("levelId");

-- CreateIndex
CREATE INDEX "StudentProfile_groupId_idx" ON "StudentProfile"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_code_key" ON "Group"("code");

-- CreateIndex
CREATE INDEX "Group_levelId_idx" ON "Group"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");

-- CreateIndex
CREATE INDEX "ScheduleEvent_groupId_startsAt_idx" ON "ScheduleEvent"("groupId", "startsAt");

-- CreateIndex
CREATE INDEX "ScheduleEvent_studentId_startsAt_idx" ON "ScheduleEvent"("studentId", "startsAt");

-- CreateIndex
CREATE INDEX "ScheduleEvent_disciplineId_idx" ON "ScheduleEvent"("disciplineId");

-- CreateIndex
CREATE INDEX "ScheduleEvent_teacherId_idx" ON "ScheduleEvent"("teacherId");

-- CreateIndex
CREATE INDEX "ScheduleEvent_roomId_idx" ON "ScheduleEvent"("roomId");

-- CreateIndex
CREATE INDEX "ScheduleChange_eventId_idx" ON "ScheduleChange"("eventId");

-- CreateIndex
CREATE INDEX "ScheduleChange_changedById_idx" ON "ScheduleChange"("changedById");

-- CreateIndex
CREATE INDEX "Assessment_studentId_semester_idx" ON "Assessment"("studentId", "semester");

-- CreateIndex
CREATE INDEX "Assessment_disciplineId_idx" ON "Assessment"("disciplineId");

-- CreateIndex
CREATE INDEX "AcademicDebt_studentId_status_idx" ON "AcademicDebt"("studentId", "status");

-- CreateIndex
CREATE INDEX "AcademicDebt_disciplineId_idx" ON "AcademicDebt"("disciplineId");

-- CreateIndex
CREATE INDEX "Application_studentId_status_idx" ON "Application"("studentId", "status");

-- CreateIndex
CREATE INDEX "Application_unitId_status_idx" ON "Application"("unitId", "status");

-- CreateIndex
CREATE INDEX "Application_typeId_idx" ON "Application"("typeId");

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_createdAt_idx" ON "ApplicationEvent"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationEvent_actorUserId_idx" ON "ApplicationEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "Attachment_applicationId_idx" ON "Attachment"("applicationId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_isRead_createdAt_idx" ON "Notification"("recipientId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "_ApplicationTypeToEducationLevel_B_index" ON "_ApplicationTypeToEducationLevel"("B");

-- AddForeignKey
ALTER TABLE "GradeBand" ADD CONSTRAINT "GradeBand_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationType" ADD CONSTRAINT "ApplicationType_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "EducationLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "EducationLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChange" ADD CONSTRAINT "ScheduleChange_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ScheduleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChange" ADD CONSTRAINT "ScheduleChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicDebt" ADD CONSTRAINT "AcademicDebt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicDebt" ADD CONSTRAINT "AcademicDebt_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ApplicationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationTypeToEducationLevel" ADD CONSTRAINT "_ApplicationTypeToEducationLevel_A_fkey" FOREIGN KEY ("A") REFERENCES "ApplicationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationTypeToEducationLevel" ADD CONSTRAINT "_ApplicationTypeToEducationLevel_B_fkey" FOREIGN KEY ("B") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
