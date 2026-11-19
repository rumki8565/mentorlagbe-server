import { Router, Request, Response } from "express";
import { Filter, ObjectId } from "mongodb";
import { getTuitionsCollection, getApplicationsCollection } from "../db.js";
import { Tuition } from "../types.js";
import { verifyToken, verifyTutor } from "../middleware/auth.js";
import {
  parseTuitionInput,
  TuitionParseResult,
} from "../utils/tuition-validation.js";

const router = Router();

const FREE_PLAN_LIMIT: number = 2;

const escapeRegex = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const readQuery = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

const publicFilter: Filter<Tuition> = {
  approvalStatus: "approved",
  isActive: true,
};

// GET /api/tuitions  (public: search, filter, pagination)
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const tuitions = await getTuitionsCollection();

  const q: string = readQuery(req.query.q);
  const subject: string = readQuery(req.query.subject);
  const classLevel: string = readQuery(req.query.classLevel);
  const mode: string = readQuery(req.query.mode);
  const page: number = Math.max(
    1,
    parseInt(readQuery(req.query.page), 10) || 1,
  );
  const limit: number = Math.min(
    50,
    Math.max(1, parseInt(readQuery(req.query.limit), 10) || 9),
  );

  const filter: Filter<Tuition> = { ...publicFilter };

  if (q) {
    const pattern: string = escapeRegex(q);
    filter.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { subject: { $regex: pattern, $options: "i" } },
    ];
  }
  if (subject) filter.subject = subject;
  if (classLevel) filter.classLevel = classLevel;
  if (mode === "Online" || mode === "Offline") filter.mode = mode;

  const total: number = await tuitions.countDocuments(filter);
  const items: Tuition[] = await tuitions
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  res.json({
    tuitions: items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

// GET /api/tuitions/latest  (public: 6 newest for the home page)
router.get("/latest", async (_req: Request, res: Response): Promise<void> => {
  const tuitions = await getTuitionsCollection();
  const items: Tuition[] = await tuitions
    .find(publicFilter)
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();
  res.json(items);
});

// GET /api/tuitions/filters  (public: values for the filter dropdowns)
router.get("/filters", async (_req: Request, res: Response): Promise<void> => {
  const tuitions = await getTuitionsCollection();
  const subjects: string[] = await tuitions.distinct("subject", publicFilter);
  const classLevels: string[] = await tuitions.distinct(
    "classLevel",
    publicFilter,
  );
  res.json({ subjects: subjects.sort(), classLevels: classLevels.sort() });
});

// GET /api/tuitions/mine  (tutor: own tuitions, any status)
router.get(
  "/mine",
  verifyToken,
  verifyTutor,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const tuitions = await getTuitionsCollection();
    const items: Tuition[] = await tuitions
      .find({ tutorEmail: user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(items);
  },
);

// GET /api/tuitions/mine/stats  (tutor: counts for the overview and post limit)
router.get(
  "/mine/stats",
  verifyToken,
  verifyTutor,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const tuitions = await getTuitionsCollection();
    const applications = await getApplicationsCollection();

    const [total, approved, pending, applicants] = await Promise.all([
      tuitions.countDocuments({ tutorEmail: user.email }),
      tuitions.countDocuments({
        tutorEmail: user.email,
        approvalStatus: "approved",
        isActive: true,
      }),
      tuitions.countDocuments({
        tutorEmail: user.email,
        approvalStatus: "pending",
      }),
      applications.countDocuments({ tutorEmail: user.email }),
    ]);

    res.json({
      total,
      approved,
      pending,
      applicants,
      plan: user.plan,
      freeLimit: FREE_PLAN_LIMIT,
    });
  },
);

// GET /api/tuitions/:id  (public: one approved & active tuition)
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const id: string = String(req.params.id);
  if (!ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid tuition id" });
    return;
  }
  const tuitions = await getTuitionsCollection();
  const tuition: Tuition | null = await tuitions.findOne({
    _id: new ObjectId(id),
    ...publicFilter,
  });
  if (!tuition) {
    res.status(404).json({ message: "Tuition not found" });
    return;
  }
  res.json(tuition);
});

// POST /api/tuitions  (tutor: create, free plan limited to 2)
router.post(
  "/",
  verifyToken,
  verifyTutor,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const parsed: TuitionParseResult = parseTuitionInput(req.body);
    if (!parsed.data) {
      res.status(400).json({ message: parsed.error });
      return;
    }

    const tuitions = await getTuitionsCollection();

    if (user.plan === "free") {
      const count: number = await tuitions.countDocuments({
        tutorEmail: user.email,
      });
      if (count >= FREE_PLAN_LIMIT) {
        res.status(403).json({
          message:
            "Free plan allows up to 2 tuition posts. Upgrade to Pro for unlimited posts.",
        });
        return;
      }
    }

    const doc: Tuition = {
      ...parsed.data,
      tutorName: user.name,
      tutorEmail: user.email,
      approvalStatus: "pending",
      isActive: true,
      createdAt: new Date(),
    };

    const result = await tuitions.insertOne(doc);
    res.status(201).json({ insertedId: result.insertedId });
  },
);

// PUT /api/tuitions/:id  (tutor: edit own tuition; goes back to pending review)
router.put(
  "/:id",
  verifyToken,
  verifyTutor,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const id: string = String(req.params.id);
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid tuition id" });
      return;
    }

    const parsed: TuitionParseResult = parseTuitionInput(req.body);
    if (!parsed.data) {
      res.status(400).json({ message: parsed.error });
      return;
    }

    const tuitions = await getTuitionsCollection();
    const result = await tuitions.updateOne(
      { _id: new ObjectId(id), tutorEmail: user.email },
      { $set: { ...parsed.data, approvalStatus: "pending" } },
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Tuition not found" });
      return;
    }
    res.json({ message: "Tuition updated" });
  },
);

// PATCH /api/tuitions/:id/toggle  (tutor: Active / Closed)
router.patch(
  "/:id/toggle",
  verifyToken,
  verifyTutor,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const id: string = String(req.params.id);
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid tuition id" });
      return;
    }

    const tuitions = await getTuitionsCollection();
    const existing: Tuition | null = await tuitions.findOne({
      _id: new ObjectId(id),
      tutorEmail: user.email,
    });
    if (!existing) {
      res.status(404).json({ message: "Tuition not found" });
      return;
    }

    const isActive: boolean = !existing.isActive;
    await tuitions.updateOne({ _id: new ObjectId(id) }, { $set: { isActive } });
    res.json({ isActive });
  },
);

// DELETE /api/tuitions/:id  (tutor: delete own tuition and its applications)
router.delete(
  "/:id",
  verifyToken,
  verifyTutor,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const id: string = String(req.params.id);
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid tuition id" });
      return;
    }

    const tuitions = await getTuitionsCollection();
    const result = await tuitions.deleteOne({
      _id: new ObjectId(id),
      tutorEmail: user.email,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Tuition not found" });
      return;
    }

    const applications = await getApplicationsCollection();
    await applications.deleteMany({ tuitionId: id });

    res.json({ message: "Tuition deleted" });
  },
);

export default router;
