import { Router, Request, Response } from "express";
import { getUsersCollection } from "../db.js";
import { User } from "../types.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

const CHOICE_WINDOW_MS: number = 15 * 60 * 1000;

// PATCH /api/users/onboarding-role  (one time only, shortly after sign up)
router.patch(
  "/onboarding-role",
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    const email: string | undefined = req.user?.email;
    const role: unknown = req.body?.role;

    if (!email) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (role !== "student" && role !== "tutor") {
      res.status(400).json({ message: "Role must be student or tutor" });
      return;
    }

    const users = await getUsersCollection();
    const user: User | null = await users.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (user.role === "admin") {
      res.status(403).json({ message: "Admin roles cannot be changed here" });
      return;
    }
    if (user.onboarded) {
      res.status(403).json({ message: "You have already chosen your role" });
      return;
    }
    if (Date.now() - new Date(user.createdAt).getTime() > CHOICE_WINDOW_MS) {
      res
        .status(403)
        .json({
          message: "Your role can only be chosen right after signing up",
        });
      return;
    }

    await users.updateOne({ email }, { $set: { role, onboarded: true } });
    res.json({ role });
  },
);

export default router;
