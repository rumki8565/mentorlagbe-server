# MentorLagbe Server

Express and MongoDB API for the MentorLagbe tuition platform (BetterAuth, JWT role-based middlewares, Stripe).

- **Live API:** https://mentorlagbe-server-puce.vercel.app/
- **Client Repository:** https://github.com/rumki8565/mentorlagbe-client

## Key Features

- BetterAuth with the MongoDB adapter
- JWT verification with `verifyToken`, `verifyStudent`, `verifyTutor` and `verifyAdmin` middlewares
- Tuitions API with server-side search, filters and pagination
- Applications API with duplicate prevention
- Stripe Checkout, payment verification and webhook
- Admin APIs for users, tuition approval, stats and transactions
- Seed script for demo data (`npm run seed`)

## NPM Packages Used

express, cors, dotenv, mongodb, jsonwebtoken, better-auth, stripe, typescript, tsx

## Run Locally

```bash
npm install
npm run dev
```

Create a `.env` file:

```
PORT=5000
CLIENT_URL=http://localhost:3000
MONGODB_URI=
DB_NAME=mentorlagbe
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:5000
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```
