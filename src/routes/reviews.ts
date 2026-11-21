import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getApplicationsCollection } from "../db.js";
import { Application } from "../types.js";
import { verifyToken, verifyStudent } from "../middleware/auth.js";

const router = Router();

interface ReviewRow {
  _id: ObjectId;
  studentName: string;
  rating: number;
  feedback: string;
  reviewedAt: Date;
}

// GET /api/reviews/:tuitionId  (public: all reviews and the average)
router.get(
  "/:tuitionId",
  async (req: Request, res: Response): Promise<void> => {
    const tuitionId: string = String(req.params.tuitionId);
    const applications = await getApplicationsCollection();

    const reviews: ReviewRow[] = await applications
      .find({ tuitionId, rating: { $exists: true } })
      .project<ReviewRow>({
        studentName: 1,
        rating: 1,
        feedback: 1,
        reviewedAt: 1,
      })
      .sort({ reviewedAt: -1 })
      .toArray();

    const count: number = reviews.length;
    const total: number = reviews.reduce(
      (sum: number, item: ReviewRow) => sum + item.rating,
      0,
    );
    const average: number =
      count > 0 ? Math.round((total / count) * 10) / 10 : 0;

    res.json({ reviews, average, count });
  },
);

// GET /api/reviews/:tuitionId/mine  (student: can I review, and what did I write?)
router.get(
  "/:tuitionId/mine",
  verifyToken,
  verifyStudent,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const applications = await getApplicationsCollection();
    const application: Application | null = await applications.findOne({
      tuitionId: String(req.params.tuitionId),
      studentEmail: user.email,
    });

    res.json({
      eligible: application?.status === "accepted",
      rating: application?.rating ?? null,
      feedback: application?.feedback ?? null,
    });
  },
);

// POST /api/reviews/:tuitionId  (student with an accepted application: create or update)
router.post(
  "/:tuitionId",
  verifyToken,
  verifyStudent,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const tuitionId: string = String(req.params.tuitionId);
    const rating: number = Number(req.body?.rating);
    const feedback: string =
      typeof req.body?.feedback === "string" ? req.body.feedback.trim() : "";

    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res
        .status(400)
        .json({ message: "Rating must be a whole number from 1 to 5" });
      return;
    }
    if (feedback.length < 10 || feedback.length > 500) {
      res
        .status(400)
        .json({ message: "Feedback must be between 10 and 500 characters" });
      return;
    }

    const applications = await getApplicationsCollection();
    const result = await applications.updateOne(
      { tuitionId, studentEmail: user.email, status: "accepted" },
      { $set: { rating, feedback, reviewedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      res
        .status(403)
        .json({
          message:
            "Only students with an accepted application can review this tuition",
        });
      return;
    }

    res.status(201).json({ message: "Review saved" });
  },
);

export default router;
