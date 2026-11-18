import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getTuitionsCollection } from "../db.js";
import { Tuition } from "../types.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken, verifyAdmin);

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

export default router;
