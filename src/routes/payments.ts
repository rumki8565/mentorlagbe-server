import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { getPaymentsCollection, getUsersCollection } from "../db.js";
import { Payment, Role } from "../types.js";
import { verifyToken } from "../middleware/auth.js";
import { getStripe } from "../stripe.js";

const router = Router();

interface PlanConfig {
  planName: string;
  amountCents: number;
}

const PLAN_BY_ROLE: Partial<Record<Role, PlanConfig>> = {
  tutor: { planName: "Pro Tutor Plan", amountCents: 1500 },
  student: { planName: "Pro Student Plan", amountCents: 1000 },
};

const errorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unknown error";
};

// Safe to call more than once for the same session (no duplicate records)
const fulfillSession = async (
  session: Stripe.Checkout.Session,
): Promise<Payment | null> => {
  const email: string | undefined = session.metadata?.userEmail;
  if (session.payment_status !== "paid" || !email) {
    return null;
  }

  const payments = await getPaymentsCollection();
  const users = await getUsersCollection();

  const transactionId: string =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? session.id);

  const role: Role =
    session.metadata?.userRole === "tutor" ? "tutor" : "student";

  const record: Omit<Payment, "stripeSessionId"> = {
    userEmail: email,
    userName: session.metadata?.userName ?? email,
    userRole: role,
    planName: session.metadata?.planName ?? "Pro Plan",
    amount: (session.amount_total ?? 0) / 100,
    currency: session.currency ?? "usd",
    transactionId,
    paymentStatus: "paid",
    paidAt: new Date(),
  };

  await payments.updateOne(
    { stripeSessionId: session.id },
    { $setOnInsert: record },
    { upsert: true },
  );
  await users.updateOne({ email }, { $set: { plan: "pro" } });

  return payments.findOne({ stripeSessionId: session.id });
};

// POST /api/payments/create-checkout-session
router.post(
  "/create-checkout-session",
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const plan: PlanConfig | undefined = PLAN_BY_ROLE[user.role];
    if (!plan) {
      res
        .status(403)
        .json({ message: "Only students and tutors can buy a Pro plan" });
      return;
    }
    if (user.plan === "pro") {
      res.status(400).json({ message: "You are already on the Pro plan" });
      return;
    }

    const clientUrl: string = process.env.CLIENT_URL ?? "http://localhost:3000";

    try {
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: plan.amountCents,
              product_data: { name: plan.planName },
            },
          },
        ],
        metadata: {
          userEmail: user.email,
          userName: user.name,
          userRole: user.role,
          planName: plan.planName,
        },
        success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/payment/cancel`,
      });

      res.json({ url: session.url });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ message: `Could not start checkout: ${errorMessage(error)}` });
    }
  },
);

// POST /api/payments/verify  (called by the success page)
router.post(
  "/verify",
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const sessionId: unknown = req.body?.sessionId;

    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
      res.status(400).json({ message: "Invalid session id" });
      return;
    }

    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);

      if (session.metadata?.userEmail !== user.email) {
        res
          .status(403)
          .json({ message: "This payment belongs to another account" });
        return;
      }
      if (session.payment_status !== "paid") {
        res.status(400).json({ message: "Payment has not been completed" });
        return;
      }

      const payment: Payment | null = await fulfillSession(session);
      res.json({ plan: "pro", payment });
    } catch (error: unknown) {
      res
        .status(500)
        .json({ message: `Could not verify payment: ${errorMessage(error)}` });
    }
  },
);

// Stripe webhook (mounted in index.ts with a raw body parser)
export const handleWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const secret: string | undefined = process.env.STRIPE_WEBHOOK_SECRET;
  const signature: string | string[] | undefined =
    req.headers["stripe-signature"];

  if (!secret || typeof signature !== "string") {
    res.status(400).send("Webhook is not configured");
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body as Buffer,
      signature,
      secret,
    );
  } catch {
    res.status(400).send("Invalid webhook signature");
    return;
  }

  if (event.type === "checkout.session.completed") {
    await fulfillSession(event.data.object);
  }

  res.json({ received: true });
};

export default router;
