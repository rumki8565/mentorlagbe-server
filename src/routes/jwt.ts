import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ message: "Not signed in" });
    return;
  }

  const secret: string | undefined = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: "Server configuration error" });
    return;
  }

  const token: string = jwt.sign({ email: session.user.email }, secret, {
    expiresIn: "1d",
  });

  res.json({ token });
});

export default router;
