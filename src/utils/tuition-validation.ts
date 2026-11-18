import { TuitionMode } from "../types.js";

export interface TuitionInput {
  title: string;
  subject: string;
  classLevel: string;
  mode: TuitionMode;
  location: string;
  monthlyFee: number;
  daysPerWeek: number;
  bannerImage: string;
  description: string;
}

export type TuitionParseResult =
  | { data: TuitionInput; error?: undefined }
  | { error: string; data?: undefined };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const readString = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

export const parseTuitionInput = (body: unknown): TuitionParseResult => {
  if (!isRecord(body)) {
    return { error: "Invalid request body" };
  }

  const title: string = readString(body.title);
  const subject: string = readString(body.subject);
  const classLevel: string = readString(body.classLevel);
  const location: string = readString(body.location);
  const bannerImage: string = readString(body.bannerImage);
  const description: string = readString(body.description);
  const monthlyFee: number = Number(body.monthlyFee);
  const daysPerWeek: number = Number(body.daysPerWeek);
  const mode = body.mode;

  if (title.length < 5) return { error: "Title must be at least 5 characters" };
  if (!subject) return { error: "Subject is required" };
  if (!classLevel) return { error: "Class level is required" };
  if (mode !== "Online" && mode !== "Offline") {
    return { error: "Mode must be Online or Offline" };
  }
  if (!location) return { error: "Location is required" };
  if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) {
    return { error: "Monthly fee must be a positive number" };
  }
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
    return { error: "Days per week must be between 1 and 7" };
  }
  if (!bannerImage.startsWith("http")) {
    return { error: "A valid banner image URL is required" };
  }
  if (description.length < 20) {
    return { error: "Description must be at least 20 characters" };
  }

  return {
    data: {
      title,
      subject,
      classLevel,
      mode,
      location,
      monthlyFee,
      daysPerWeek,
      bannerImage,
      description,
    },
  };
};
