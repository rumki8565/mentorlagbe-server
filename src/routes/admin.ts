import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import {
  getPaymentsCollection,
  getTuitionsCollection,
  getUsersCollection,
} from "../db.js";
import { Payment, Role, Tuition, User } from "../types.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken, verifyAdmin);

const isRole = (value: unknown): value is Role => {
  return value === "student" || value === "tutor" || value === "admin";
};

// GET /api/admin/stats
router.get("/stats", async (_req: Request, res: Response): Promise<void> => {
  const users = await getUsersCollection();
  const tuitions = await getTuitionsCollection();
  const payments = await getPaymentsCollection();

  const [
    totalUsers,
    totalTutors,
    pendingTuitions,
    approvedTuitions,
    revenueResult,
  ] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ role: "tutor" }),
    tuitions.countDocuments({ approvalStatus: "pending" }),
    tuitions.countDocuments({ approvalStatus: "approved" }),
    payments
      .aggregate<{
        _id: null;
        total: number;
      }>([{ $group: { _id: null, total: { $sum: "$amount" } } }])
      .toArray(),
  ]);

  res.json({
    totalUsers,
    totalTutors,
    pendingTuitions,
    approvedTuitions,
    revenue: revenueResult[0]?.total ?? 0,
  });
});

// GET /api/admin/users
router.get("/users", async (_req: Request, res: Response): Promise<void> => {
  const users = await getUsersCollection();
  const items: User[] = await users.find({}).sort({ createdAt: -1 }).toArray();
  res.json(items);
});

// PATCH /api/admin/users/:id/role
router.patch(
  "/users/:id/role",
  async (req: Request, res: Response): Promise<void> => {
    const id: string = String(req.params.id);
    const role: unknown = req.body?.role;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }
    if (!isRole(role)) {
      res.status(400).json({ message: "Role must be student, tutor or admin" });
      return;
    }

    const users = await getUsersCollection();
    const target: User | null = await users.findOne({ _id: new ObjectId(id) });

    if (!target) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (target.email === req.user?.email) {
      res.status(400).json({ message: "You cannot change your own role" });
      return;
    }

    await users.updateOne({ _id: new ObjectId(id) }, { $set: { role } });
    res.json({ message: "Role updated", role });
  },
);

// GET /api/admin/tuitions  (all tuitions, any status)
router.get("/tuitions", async (_req: Request, res: Response): Promise<void> => {
  const tuitions = await getTuitionsCollection();
  const items: Tuition[] = await tuitions
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  res.json(items);
});

// PATCH /api/admin/tuitions/:id/status  (approve or reject)
router.patch(
  "/tuitions/:id/status",
  async (req: Request, res: Response): Promise<void> => {
    const id: string = String(req.params.id);
    const status: unknown = req.body?.status;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid tuition id" });
      return;
    }
    if (status !== "approved" && status !== "rejected") {
      res.status(400).json({ message: "Status must be approved or rejected" });
      return;
    }

    const tuitions = await getTuitionsCollection();
    const result = await tuitions.updateOne(
      { _id: new ObjectId(id) },
      { $set: { approvalStatus: status } },
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Tuition not found" });
      return;
    }
    res.json({ message: `Tuition ${status}`, approvalStatus: status });
  },
);

// GET /api/admin/transactions
router.get(
  "/transactions",
  async (_req: Request, res: Response): Promise<void> => {
    const payments = await getPaymentsCollection();
    const items: Payment[] = await payments
      .find({})
      .sort({ paidAt: -1 })
      .toArray();
    res.json(items);
  },
);

export default router;
