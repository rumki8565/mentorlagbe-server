import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { getDb } from "./db.js";
import { auth } from "./auth.js";
import jwtRouter from "./routes/jwt.js";
import tuitionsRouter from "./routes/tuitions.js";
import adminRouter from "./routes/admin.js";

const app = express();
const port: number = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// BetterAuth handler must come BEFORE express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    await getDb();
    res.send("MentorLagbe server is running and MongoDB is connected");
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Database connection failed: ${message}` });
  }
});

app.use("/api/jwt", jwtRouter);
app.use("/api/tuitions", tuitionsRouter);
app.use("/api/admin", adminRouter);

app.listen(port, (): void => {
  console.log(`Server running on port ${port}`);
});
