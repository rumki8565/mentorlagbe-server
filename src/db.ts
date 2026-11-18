import { MongoClient, Db, Collection } from "mongodb";
import { User, Tuition, Application, Payment } from "./types";

let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

export const getDb = (): Promise<Db> => {
  if (!dbPromise) {
    const uri: string | undefined = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is missing in .env");
    }
    client = new MongoClient(uri);
    dbPromise = client.connect().then((connected: MongoClient): Db => {
      return connected.db(process.env.DB_NAME || "mentorlagbe");
    });
  }
  return dbPromise;
};

export const getUsersCollection = async (): Promise<Collection<User>> => {
  const db: Db = await getDb();
  return db.collection<User>("users");
};

export const getTuitionsCollection = async (): Promise<Collection<Tuition>> => {
  const db: Db = await getDb();
  return db.collection<Tuition>("tuitions");
};

export const getApplicationsCollection = async (): Promise<
  Collection<Application>
> => {
  const db: Db = await getDb();
  return db.collection<Application>("applications");
};

export const getPaymentsCollection = async (): Promise<Collection<Payment>> => {
  const db: Db = await getDb();
  return db.collection<Payment>("payments");
};
