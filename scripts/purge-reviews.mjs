import { readFileSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is missing');
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
const reviews = db.collection('reviews');
const products = db.collection('products');

const before = await reviews.countDocuments();
const deleted = await reviews.deleteMany({});
await products.updateMany({}, { $set: { averageRating: 0, reviewCount: 0 } });
const after = await reviews.countDocuments();

console.log(`Removed ${deleted.deletedCount} reviews (${before} -> ${after}). Review collection is empty and ready.`);
await mongoose.disconnect();
