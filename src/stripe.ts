import Stripe from "stripe";

let client: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!client) {
    const key: string | undefined = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is missing in .env");
    }
    client = new Stripe(key);
  }
  return client;
};
