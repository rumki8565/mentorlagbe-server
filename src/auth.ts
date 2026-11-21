import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getDb } from "./db.js";

const db = await getDb();
const clientUrl: string = process.env.CLIENT_URL ?? "http://localhost:3000";
const isProduction: boolean = process.env.NODE_ENV === "production";

const googleClientId: string | undefined = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret: string | undefined = process.env.GOOGLE_CLIENT_SECRET;
export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [clientUrl],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            prompt: "select_account",
          },
        }
      : {},
  user: {
    modelName: "users",
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        input: true,
      },
      plan: {
        type: "string",
        required: false,
        defaultValue: "free",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      bio: {
        type: "string",
        required: false,
        input: true,
      },
      onboarded: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const role: "student" | "tutor" =
            user.role === "tutor" ? "tutor" : "student";
          return {
            data: {
              ...user,
              role,
              plan: "free",
            },
          };
        },
      },
    },
  },
  advanced: {
    defaultCookieAttributes: isProduction
      ? { sameSite: "none", secure: true, httpOnly: true }
      : {},
  },
});
