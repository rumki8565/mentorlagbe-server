import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getApplicationsCollection, getTuitionsCollection } from "../db.js";
import { Application, Tuition } from "../types.js";
import { verifyToken, verifyStudent, verifyTutor } from "../middleware/auth.js";

const router = Router();

const PHONE_PATTERN: RegExp = /^[+\d][\d\s-]{6,}$/;

let indexReady: Promise<string> | null = null;

// Unique index: one application per student per tuition
const ensureIndex = async (): Promise<void> => {
  if (!indexReady) {
    const applications = await getApplicationsCollection();
    indexReady = applications.createIndex(
      { tuitionId: 1, studentEmail: 1 },
      { unique: true },
    );
  }
  await indexReady;
};

const readString = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

const isDuplicateKeyError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
};

// GET /api/applications/mine  (student: own applications)
router.get(
  "/mine",
  verifyToken,
  verifyStudent,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const applications = await getApplicationsCollection();
    const items: Application[] = await applications
      .find({ studentEmail: user.email })
      .sort({ appliedAt: -1 })
      .toArray();
    res.json(items);
  },
);

// GET /api/applications/received  (tutor: applicants for own tuitions)
router.get(
  "/received",
  verifyToken,
  verifyTutor,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const applications = await getApplicationsCollection();
    const items: Application[] = await applications
      .find({ tutorEmail: user.email })
      .sort({ appliedAt: -1 })
      .toArray();
    res.json(items);
  },
);

// GET /api/applications/check/:tuitionId  (student: have I applied already?)
router.get(
  "/check/:tuitionId",
  verifyToken,
  verifyStudent,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const applications = await getApplicationsCollection();
    const existing: Application | null = await applications.findOne({
      tuitionId: String(req.params.tuitionId),
      studentEmail: user.email,
    });
    res.json({ applied: existing !== null, status: existing?.status ?? null });
  },
);

// POST /api/applications  (student: apply for a tuition)
router.post(
  "/",
  verifyToken,
  verifyStudent,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const tuitionId: string = readString(req.body?.tuitionId);
    const studentPhone: string = readString(req.body?.studentPhone);
    const preferredSchedule: string = readString(req.body?.preferredSchedule);
    const studentNote: string = readString(req.body?.studentNote);

    if (!ObjectId.isValid(tuitionId)) {
      res.status(400).json({ message: "Invalid tuition id" });
      return;
    }
    if (!PHONE_PATTERN.test(studentPhone)) {
      res.status(400).json({ message: "Enter a valid phone number" });
      return;
    }
    if (preferredSchedule.length < 3) {
      res.status(400).json({ message: "Preferred schedule is required" });
      return;
    }
    if (studentNote.length < 10) {
      res
        .status(400)
        .json({ message: "Learning note must be at least 10 characters" });
      return;
    }

    const tuitions = await getTuitionsCollection();
    const tuition: Tuition | null = await tuitions.findOne({
      _id: new ObjectId(tuitionId),
      approvalStatus: "approved",
      isActive: true,
    });
    if (!tuition) {
      res.status(404).json({ message: "This tuition is not available" });
      return;
    }

    await ensureIndex();
    const applications = await getApplicationsCollection();

    const existing: Application | null = await applications.findOne({
      tuitionId,
      studentEmail: user.email,
    });
    if (existing) {
      res
        .status(409)
        .json({ message: "You have already applied for this tuition" });
      return;
    }

    const doc: Application = {
      tuitionId,
      tuitionTitle: tuition.title,
      subject: tuition.subject,
      monthlyFee: tuition.monthlyFee,
      tutorEmail: tuition.tutorEmail,
      studentName: user.name,
      studentEmail: user.email,
      studentPhone,
      preferredSchedule,
      studentNote,
      status: "pending",
      appliedAt: new Date(),
    };

    try {
      const result = await applications.insertOne(doc);
      res.status(201).json({ insertedId: result.insertedId });
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        res
          .status(409)
          .json({ message: "You have already applied for this tuition" });
        return;
      }
      throw error;
    }
  },
);

// DELETE /api/applications/:id  (student: cancel own pending application)
router.delete(
  "/:id",
  verifyToken,
  verifyStudent,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const id: string = String(req.params.id);
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid application id" });
      return;
    }

    const applications = await getApplicationsCollection();
    const existing: Application | null = await applications.findOne({
      _id: new ObjectId(id),
      studentEmail: user.email,
    });

    if (!existing) {
      res.status(404).json({ message: "Application not found" });
      return;
    }
    if (existing.status !== "pending") {
      res
        .status(400)
        .json({ message: "Only pending applications can be cancelled" });
      return;
    }

    await applications.deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Application cancelled" });
  },
);

// PATCH /api/applications/:id/status  (tutor: accept or reject)
router.patch(
  "/:id/status",
  verifyToken,
  verifyTutor,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const id: string = String(req.params.id);
    const status: unknown = req.body?.status;

    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid application id" });
      return;
    }
    if (status !== "accepted" && status !== "rejected") {
      res.status(400).json({ message: "Status must be accepted or rejected" });
      return;
    }

    const applications = await getApplicationsCollection();
    const result = await applications.updateOne(
      { _id: new ObjectId(id), tutorEmail: user.email },
      { $set: { status } },
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Application not found" });
      return;
    }
    res.json({ message: `Application ${status}`, status });
  },
);

export default router;
