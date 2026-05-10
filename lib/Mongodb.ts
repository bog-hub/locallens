// lib/mongodb.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    'Please define MONGODB_URI in your .env.local file.\n' +
    'Get a free URI at https://cloud.mongodb.com'
  );
}


/**
 * In development, Next.js hot-reloads the module system on every save.
 * Without caching the connection on `global`, we'd open a new connection
 * on every hot reload and quickly exhaust MongoDB's connection pool.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  // Already connected — return immediately
  if (cached.conn) return cached.conn;

  // Connection in progress — wait for it
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false, // fail fast instead of buffering queries
      maxPoolSize: 10,       // max simultaneous connections
      serverSelectionTimeoutMS: 10000, // wait 10s before giving up
      socketTimeoutMS: 45000,          // close sockets after 45s of inactivity
      connectTimeoutMS: 10000,         // initial connection timeout
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;  // allow retry on next call
    throw err;
  }

  return cached.conn;
}