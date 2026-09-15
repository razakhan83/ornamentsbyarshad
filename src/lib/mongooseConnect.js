import 'server-only';
import mongoose from 'mongoose';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

let cached = global.__mongooseConnection;
const isDev = process.env.NODE_ENV !== 'production';
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const isServerlessLike =
  process.env.VERCEL === '1' ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.LAMBDA_TASK_ROOT);
const useFastRuntimeTimeouts = isServerlessLike && !isBuildPhase;

if (!cached) {
  cached = global.__mongooseConnection = { conn: null, promise: null };
}

const connectionOptions = {
  bufferCommands: false,
  autoIndex: false,
  maxPoolSize: isBuildPhase ? 30 : (isServerlessLike ? 10 : 25),
  minPoolSize: isDev ? 2 : 0,
  maxConnecting: isBuildPhase ? 10 : 4,
  maxIdleTimeMS: isDev ? 300000 : 30000,
  waitQueueTimeoutMS: isBuildPhase ? 30000 : 10000,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  // Pakistan → Atlas RTT is often >50ms; zlib is built into the driver (no extra native dep).
  compressors: ['zlib'],
};

async function createConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable in Vercel / .env.local');
  }

  const startedAt = performance.now();

  return mongoose.connect(uri, connectionOptions)
    .then((mongooseInstance) => {
      if (isDev) {
        console.log(`[DB] MongoDB connected in ${Math.round(performance.now() - startedAt)}ms`);
      }
      return mongooseInstance;
    })
    .catch((err) => {
      console.error(`[DB] MongoDB connection error after ${Math.round(performance.now() - startedAt)}ms:`, err.message);
      cached.promise = null;
      throw err;
    });
}

async function mongooseConnect() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return cached.conn;
  }

  if (mongoose.connection.readyState === 2 && cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  if (mongoose.connection.readyState === 0 || !cached.promise) {
    cached.conn = null;
    cached.promise = createConnection();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

export default mongooseConnect;
