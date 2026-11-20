import "dotenv/config";
import { ObjectId } from "mongodb";
import {
  getApplicationsCollection,
  getTuitionsCollection,
  getUsersCollection,
} from "./db.js";
import {
  Application,
  ApplicationStatus,
  ApprovalStatus,
  Plan,
  Tuition,
  TuitionMode,
  User,
} from "./types.js";

const SEED_DOMAIN: string = "seed.mentorlagbe.com";
const SEED_EMAIL_REGEX: string = "@seed\\.mentorlagbe\\.com$";

interface SeedPerson {
  name: string;
  slug: string;
  plan: Plan;
}

interface SeedTuition {
  tutor: number;
  title: string;
  subject: string;
  classLevel: string;
  mode: TuitionMode;
  location: string;
  monthlyFee: number;
  daysPerWeek: number;
  description: string;
  status: ApprovalStatus;
  isActive: boolean;
}

const TUTORS: SeedPerson[] = [
  { name: "Tanvir Hasan", slug: "tanvir-hasan", plan: "pro" },
  { name: "Nusrat Jahan", slug: "nusrat-jahan", plan: "pro" },
  { name: "Arif Rahman", slug: "arif-rahman", plan: "free" },
  { name: "Farhana Akter", slug: "farhana-akter", plan: "pro" },
  { name: "Sabbir Ahmed", slug: "sabbir-ahmed", plan: "free" },
];

const STUDENTS: SeedPerson[] = [
  { name: "Rafi Islam", slug: "rafi-islam", plan: "free" },
  { name: "Maliha Khan", slug: "maliha-khan", plan: "pro" },
  { name: "Shakib Hossain", slug: "shakib-hossain", plan: "free" },
  { name: "Tasnim Sultana", slug: "tasnim-sultana", plan: "free" },
  { name: "Imran Chowdhury", slug: "imran-chowdhury", plan: "free" },
  { name: "Sumaiya Rahman", slug: "sumaiya-rahman", plan: "free" },
];

const SEED_TUITIONS: SeedTuition[] = [
  {
    tutor: 1,
    title: "HSC Physics Concept and Problem Solving Batch",
    subject: "Physics",
    classLevel: "HSC",
    mode: "Online",
    location: "Zoom",
    monthlyFee: 2500,
    daysPerWeek: 3,
    description:
      "Concept-first physics batch covering the full HSC syllabus, with weekly tests, doubt-solving sessions and recorded classes for revision.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 0,
    title: "SSC Higher Math Complete Course",
    subject: "Math",
    classLevel: "SSC",
    mode: "Offline",
    location: "Agrabad, Chittagong",
    monthlyFee: 2000,
    daysPerWeek: 4,
    description:
      "Step-by-step higher math for SSC with plenty of practice sets and model tests. Small batches so every student gets personal attention.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 0,
    title: "Web Development with JavaScript and React",
    subject: "Programming",
    classLevel: "Professional",
    mode: "Online",
    location: "Google Meet",
    monthlyFee: 4500,
    daysPerWeek: 3,
    description:
      "Learn modern web development from HTML and CSS to JavaScript and React by building real projects. Includes code reviews and portfolio guidance.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 3,
    title: "IELTS Academic Preparation Batch",
    subject: "IELTS",
    classLevel: "Professional",
    mode: "Online",
    location: "Zoom",
    monthlyFee: 3500,
    daysPerWeek: 3,
    description:
      "Focused preparation for all four IELTS modules with weekly mock tests, speaking practice and detailed writing feedback from an experienced mentor.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 1,
    title: "HSC Chemistry Organic and Physical Mastery",
    subject: "Chemistry",
    classLevel: "HSC",
    mode: "Offline",
    location: "Dhanmondi, Dhaka",
    monthlyFee: 2800,
    daysPerWeek: 3,
    description:
      "Clear explanations of organic and physical chemistry with reaction maps, short notes and regular chapter-wise exams.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 2,
    title: "Class 6-8 All Subjects Home Tutoring",
    subject: "Math",
    classLevel: "Class 6-8",
    mode: "Offline",
    location: "Zindabazar, Sylhet",
    monthlyFee: 1500,
    daysPerWeek: 5,
    description:
      "Friendly home tutoring that builds strong fundamentals in math and science, with daily homework support and monthly progress reports for parents.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 3,
    title: "Spoken English and Grammar for Beginners",
    subject: "English",
    classLevel: "University",
    mode: "Online",
    location: "Google Meet",
    monthlyFee: 1800,
    daysPerWeek: 2,
    description:
      "Build confidence in everyday English through guided conversation, vocabulary building and simple grammar lessons with live feedback.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 4,
    title: "Medical Admission Biology Crash Program",
    subject: "Biology",
    classLevel: "Admission",
    mode: "Offline",
    location: "Boyra, Khulna",
    monthlyFee: 3000,
    daysPerWeek: 4,
    description:
      "Intensive admission-focused biology program with question bank practice, previous year analysis and weekly timed exams.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 4,
    title: "Engineering Admission Math and Physics Prep",
    subject: "Physics",
    classLevel: "Admission",
    mode: "Online",
    location: "Zoom",
    monthlyFee: 3200,
    daysPerWeek: 4,
    description:
      "Shortcut techniques and deep concept clarity for engineering admission tests, supported by daily practice problems and doubt clearing.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 0,
    title: "Python Programming for Absolute Beginners",
    subject: "Programming",
    classLevel: "Class 6-8",
    mode: "Online",
    location: "Zoom",
    monthlyFee: 2200,
    daysPerWeek: 2,
    description:
      "A playful introduction to coding with Python. Students build small games and tools while learning logic, loops and functions.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 2,
    title: "SSC ICT and General Science Support Class",
    subject: "ICT",
    classLevel: "SSC",
    mode: "Offline",
    location: "Rajshahi Sadar",
    monthlyFee: 1700,
    daysPerWeek: 3,
    description:
      "Practical ICT lessons and general science revision with notes, class tests and board question practice for SSC candidates.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 3,
    title: "University Calculus and Linear Algebra Help",
    subject: "Math",
    classLevel: "University",
    mode: "Online",
    location: "Google Meet",
    monthlyFee: 2600,
    daysPerWeek: 2,
    description:
      "Clear walkthroughs of calculus and linear algebra for first and second year students, with assignment help and exam-focused practice.",
    status: "approved",
    isActive: true,
  },
  {
    tutor: 1,
    title: "Class 1-5 Creative Learning and English Basics",
    subject: "English",
    classLevel: "Class 1-5",
    mode: "Offline",
    location: "Panchlaish, Chittagong",
    monthlyFee: 1400,
    daysPerWeek: 4,
    description:
      "Playful and caring lessons for young learners covering reading, writing and basic arithmetic through games and storytelling.",
    status: "pending",
    isActive: true,
  },
  {
    tutor: 4,
    title: "HSC ICT Practical and Theory Batch",
    subject: "ICT",
    classLevel: "HSC",
    mode: "Online",
    location: "Zoom",
    monthlyFee: 2100,
    daysPerWeek: 3,
    description:
      "Complete HSC ICT preparation including number systems, database basics and programming, with practical sessions and model tests.",
    status: "pending",
    isActive: true,
  },
];

const SCHEDULES: string[] = [
  "Sat, Mon, Wed evenings",
  "Sun, Tue, Thu after 6 PM",
  "Weekends only, mornings",
  "Fri and Sat afternoons",
];

const NOTES: string[] = [
  "I want to improve my concepts and score higher in the next exam.",
  "I struggle with problem solving and need regular guided practice.",
  "Looking for a patient tutor who can explain things step by step.",
  "I want to prepare seriously and need a clear weekly study plan.",
];

const STATUS_CYCLE: ApplicationStatus[] = [
  "pending",
  "accepted",
  "pending",
  "rejected",
  "accepted",
  "pending",
];

const SUBJECT_BANNERS: Record<string, string> = {
  Physics: "https://i.ibb.co.com/Lhq2zvST/physics.jpg",
  Math: "https://i.ibb.co.com/v48ncJ51/math.jpg",
  Programming: "https://i.ibb.co.com/83tVJsk/programming.jpg",
  IELTS: "https://i.ibb.co.com/4RHYHj8h/ielts.jpg",
  Chemistry: "https://i.ibb.co.com/Dg7ksw6x/chemistry.jpg",
  English: "https://i.ibb.co.com/nNcnh7vW/english.jpg",
  Biology: "https://i.ibb.co.com/9X9CtJF/biology.jpg",
  ICT: "https://i.ibb.co.com/0j4yZZT7/ict.jpg",
};

const emailFor = (slug: string): string => `${slug}@${SEED_DOMAIN}`;

const daysAgo = (days: number): Date => {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

const run = async (): Promise<void> => {
  const users = await getUsersCollection();
  const tuitions = await getTuitionsCollection();
  const applications = await getApplicationsCollection();

  // 1. Remove old demo data (only items tied to demo emails)
  await applications.deleteMany({
    $or: [
      { tutorEmail: { $regex: SEED_EMAIL_REGEX } },
      { studentEmail: { $regex: SEED_EMAIL_REGEX } },
    ],
  });
  await tuitions.deleteMany({ tutorEmail: { $regex: SEED_EMAIL_REGEX } });
  await users.deleteMany({ email: { $regex: SEED_EMAIL_REGEX } });

  // 2. Demo users
  const tutorDocs: User[] = TUTORS.map((person: SeedPerson, index: number) => ({
    name: person.name,
    email: emailFor(person.slug),
    image: `https://i.pravatar.cc/150?u=${person.slug}`,
    role: "tutor",
    plan: person.plan,
    bio: "Experienced tutor on MentorLagbe.",
    createdAt: daysAgo(60 - index * 3),
  }));

  const studentDocs: User[] = STUDENTS.map(
    (person: SeedPerson, index: number) => ({
      name: person.name,
      email: emailFor(person.slug),
      image: `https://i.pravatar.cc/150?u=${person.slug}`,
      role: "student",
      plan: person.plan,
      createdAt: daysAgo(45 - index * 3),
    }),
  );

  await users.insertMany([...tutorDocs, ...studentDocs]);

  // 3. Tuitions
  const tuitionDocs: Tuition[] = SEED_TUITIONS.map(
    (item: SeedTuition, index: number) => {
      const tutor: SeedPerson = TUTORS[item.tutor];
      return {
        title: item.title,
        subject: item.subject,
        classLevel: item.classLevel,
        mode: item.mode,
        location: item.location,
        monthlyFee: item.monthlyFee,
        daysPerWeek: item.daysPerWeek,
        bannerImage: SUBJECT_BANNERS[item.subject],
        description: item.description,
        tutorName: tutor.name,
        tutorEmail: emailFor(tutor.slug),
        approvalStatus: item.status,
        isActive: item.isActive,
        createdAt: daysAgo(30 - index * 2),
      };
    },
  );

  const inserted = await tuitions.insertMany(tuitionDocs);

  // 4. Applications for approved tuitions
  const applicationDocs: Application[] = [];
  let counter: number = 0;

  tuitionDocs.forEach((tuition: Tuition, index: number) => {
    if (tuition.approvalStatus !== "approved") {
      return;
    }
    const tuitionId: ObjectId = inserted.insertedIds[index];
    const applicantCount: number = (index % 3) + 1;

    for (let i = 0; i < applicantCount; i += 1) {
      const student: SeedPerson = STUDENTS[(index + i) % STUDENTS.length];
      applicationDocs.push({
        tuitionId: tuitionId.toString(),
        tuitionTitle: tuition.title,
        subject: tuition.subject,
        monthlyFee: tuition.monthlyFee,
        tutorEmail: tuition.tutorEmail,
        studentName: student.name,
        studentEmail: emailFor(student.slug),
        studentPhone: `0171000${String(1000 + counter)}`,
        preferredSchedule: SCHEDULES[counter % SCHEDULES.length],
        studentNote: NOTES[counter % NOTES.length],
        status: STATUS_CYCLE[counter % STATUS_CYCLE.length],
        appliedAt: daysAgo(14 - (counter % 12)),
      });
      counter += 1;
    }
  });

  await applications.insertMany(applicationDocs);

  const approvedCount: number = tuitionDocs.filter(
    (item: Tuition) => item.approvalStatus === "approved",
  ).length;

  console.log("Seed complete:");
  console.log(`  Tutors: ${tutorDocs.length}, Students: ${studentDocs.length}`);
  console.log(`  Tuitions: ${tuitionDocs.length} (${approvedCount} approved)`);
  console.log(`  Applications: ${applicationDocs.length}`);
};

run()
  .then((): void => process.exit(0))
  .catch((error: unknown): void => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
