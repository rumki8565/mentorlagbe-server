import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getDb } from "./db";

dotenv.config();

const app = express();
const port: number = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
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

app.listen(port, (): void => {
  console.log(`Server running on port ${port}`);
});
