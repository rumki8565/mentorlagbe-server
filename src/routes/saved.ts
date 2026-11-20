import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getTuitionsCollection, getUsersCollection } from "../db.js";
import { Tuition, User } from "../types.js";
import { verifyToken, verifyStudent } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken, verifyStudent);

const getSavedIds = async (email: string): Promise<string[]> => {
  const users = await getUsersCollection();
  const user: User | null = await users.findOne({ email });
  return user?.savedTuitions ?? [];
};

// GET /api/saved/ids  (just the ids, used to fill the bookmark icons)
router.get("/ids", async (req: Request, res: Response): Promise<void> => {
  const email: string | undefined = req.user?.email;
  if (!email) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  res.json(await getSavedIds(email));
});

// GET /api/saved  (full tuition objects for the Saved Tuitions page)
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const email: string | undefined = req.user?.email;
  if (!email) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const ids: ObjectId[] = (await getSavedIds(email))
    .filter((id: string) => ObjectId.isValid(id))
    .map((id: string) => new ObjectId(id));

  const tuitions = await getTuitionsCollection();
  const items: Tuition[] = await tuitions
    .find({ _id: { $in: ids }, approvalStatus: "approved", isActive: true })
    .sort({ createdAt: -1 })
    .toArray();

  res.json(items);
});

// POST /api/saved/:tuitionId
router.post(
  "/:tuitionId",
  async (req: Request, res: Response): Promise<void> => {
    const email: string | undefined = req.user?.email;
    const tuitionId: string = String(req.params.tuitionId);

    if (!email) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!ObjectId.isValid(tuitionId)) {
      res.status(400).json({ message: "Invalid tuition id" });
      return;
    }

    const tuitions = await getTuitionsCollection();
    const exists: Tuition | null = await tuitions.findOne({
      _id: new ObjectId(tuitionId),
      approvalStatus: "approved",
      isActive: true,
    });
    if (!exists) {
      res.status(404).json({ message: "This tuition is not available" });
      return;
    }

    const users = await getUsersCollection();
    await users.updateOne(
      { email },
      { $addToSet: { savedTuitions: tuitionId } },
    );
    res.status(201).json({ saved: true });
  },
);

// DELETE /api/saved/:tuitionId
router.delete(
  "/:tuitionId",
  async (req: Request, res: Response): Promise<void> => {
    const email: string | undefined = req.user?.email;
    const tuitionId: string = String(req.params.tuitionId);

    if (!email) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const users = await getUsersCollection();
    await users.updateOne({ email }, { $pull: { savedTuitions: tuitionId } });
    res.json({ saved: false });
  },
);

export default router;
