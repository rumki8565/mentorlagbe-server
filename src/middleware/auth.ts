import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getUsersCollection } from "../db.js";
import { Plan, Role } from "../types.js";

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
  plan: Plan;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const header: string | undefined = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized: token missing" });
    return;
  }

  const token: string = header.slice(7);
  const secret: string | undefined = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: "Server configuration error" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string" || typeof decoded.email !== "string") {
      res.status(401).json({ message: "Unauthorized: invalid token" });
      return;
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ email: decoded.email });

    if (!user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }

    req.user = {
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan ?? "free",
    };
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized: invalid or expired token" });
  }
};

const requireRole = (role: Role) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ message: `Forbidden: ${role} access only` });
      return;
    }
    next();
  };
};

export const verifyStudent = requireRole("student");
export const verifyTutor = requireRole("tutor");
export const verifyAdmin = requireRole("admin");
