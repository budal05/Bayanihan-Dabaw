import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri && process.env.NODE_ENV === "production") {
  // DB setup is lazy so static pages and deployment builds do not need credentials.
}

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalWithMongoose = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };
const cache = globalWithMongoose.mongooseCache ?? { conn: null, promise: null };
globalWithMongoose.mongooseCache = cache;

export async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error("Database is not configured. Add MONGODB_URI to the server environment.");
  if (cache.conn) return cache.conn;
  if (!cache.promise) cache.promise = mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false, maxPoolSize: 10, minPoolSize: 0, serverSelectionTimeoutMS: 10_000 });
  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}
