/**
 * Database Migration Script: Selective Jewelry Collection Cloner
 * 
 * Usage:
 *   Dry-run (check counts & connectivity without writing):
 *     node scripts/migrate-db.mjs --dry-run
 * 
 *   Live execution:
 *     node scripts/migrate-db.mjs
 * 
 * Environment Variables (via .env.migration or process.env):
 *   OLD_MONGODB_URI : Source MongoDB connection URI
 *   NEW_MONGODB_URI : Destination MongoDB connection URI
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Ensure reliable Atlas SRV resolution across local Windows DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

// ── 1. Load Migration Environment Variables ──────────────────────────────────
function loadEnv() {
  const envFiles = ['.env.migration', '.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          let key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          if (!process.env[key]) {
            process.env[key] = value.trim();
          }
        }
      });
    }
  }
}

loadEnv();

const OLD_URI = process.env.OLD_MONGODB_URI || process.env.MONGODB_URI;
const NEW_URI = process.env.NEW_MONGODB_URI;
const isDryRun = process.argv.includes('--dry-run');

// ── 2. Explicit List of All 19 Jewelry Application Collections ────────────────
const JEWELRY_COLLECTIONS = [
  'products',
  'categories',
  'homepages',
  'coverphotos',
  'settings',
  'reviews',
  'orders',
  'invoices',
  'abandonedcarts',
  'users',
  'coupons',
  'payments',
  'stockrequests',
  'manualcustomers',
  'notifications',
  'orderlogs',
  'feedbacks',
  'dailytraffics',
  'counters'
];

const BATCH_SIZE = 500;

async function runDatabaseMigration() {
  console.log('\n======================================================');
  console.log('       MONGODB JEWELRY STORE DATA MIGRATION           ');
  console.log('======================================================');
  console.log(`Execution Mode: ${isDryRun ? '🔍 DRY-RUN (Read-Only Preview)' : '🚀 LIVE MIGRATION'}`);

  if (!OLD_URI) {
    console.error('❌ Error: OLD_MONGODB_URI (or MONGODB_URI) is not defined.');
    process.exit(1);
  }

  if (!NEW_URI && !isDryRun) {
    console.error('❌ Error: NEW_MONGODB_URI is not defined. Please provide destination URI.');
    process.exit(1);
  }

  const oldClient = new MongoClient(OLD_URI);
  let newClient = null;

  try {
    console.log('\n[1/4] Connecting to Source Database...');
    await oldClient.connect();
    const oldDb = oldClient.db();
    console.log(`  ✓ Connected to Source DB: "${oldDb.databaseName}"`);

    let newDb = null;
    if (!isDryRun) {
      console.log('\n[2/4] Connecting to Destination Database...');
      newClient = new MongoClient(NEW_URI);
      await newClient.connect();
      newDb = newClient.db();
      console.log(`  ✓ Connected to Destination DB: "${newDb.databaseName}"`);
    }

    console.log('\n[3/4] Analyzing Source Collections...');
    const sourceCollections = await oldDb.listCollections().toArray();
    const sourceNames = new Set(sourceCollections.map((c) => c.name));

    const migrationSummary = [];

    for (const collName of JEWELRY_COLLECTIONS) {
      if (!sourceNames.has(collName)) {
        migrationSummary.push({
          collection: collName,
          status: 'SKIPPED (Not found in source DB)',
          sourceCount: 0,
          migratedCount: 0
        });
        continue;
      }

      const sourceColl = oldDb.collection(collName);
      const totalDocs = await sourceColl.countDocuments();

      if (isDryRun) {
        migrationSummary.push({
          collection: collName,
          status: 'DRY RUN VERIFIED',
          sourceCount: totalDocs,
          migratedCount: 0
        });
        continue;
      }

      // Live Migration Execution for this collection
      console.log(`\n  Processing collection: "${collName}" (${totalDocs} documents)...`);
      const destColl = newDb.collection(collName);

      // Copy custom indexes from source
      try {
        const sourceIndexes = await sourceColl.indexes();
        for (const idx of sourceIndexes) {
          if (idx.name === '_id_') continue;
          const { key, name, ...options } = idx;
          await destColl.createIndex(key, { ...options, name });
        }
      } catch (idxErr) {
        console.warn(`    ⚠️ Warning copying indexes for ${collName}:`, idxErr.message);
      }

      // Batch read and write to destination
      const cursor = sourceColl.find({});
      let batch = [];
      let writtenCount = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push({
          replaceOne: {
            filter: { _id: doc._id },
            replacement: doc,
            upsert: true
          }
        });

        if (batch.length >= BATCH_SIZE) {
          await destColl.bulkWrite(batch, { ordered: false });
          writtenCount += batch.length;
          process.stdout.write(`    Copied ${writtenCount}/${totalDocs} documents...\r`);
          batch = [];
        }
      }

      if (batch.length > 0) {
        await destColl.bulkWrite(batch, { ordered: false });
        writtenCount += batch.length;
      }

      const destCount = await destColl.countDocuments();
      console.log(`    ✓ Done: ${writtenCount} written. Target Count: ${destCount}/${totalDocs}`);

      migrationSummary.push({
        collection: collName,
        status: destCount === totalDocs ? 'SUCCESS (Exact Match)' : 'MISMATCH WARNING',
        sourceCount: totalDocs,
        migratedCount: destCount
      });
    }

    console.log('\n[4/4] Migration Summary Report:');
    console.table(migrationSummary);

    if (isDryRun) {
      console.log('\n✅ Dry-Run completed cleanly. No writes were executed on either database.');
    } else {
      console.log('\n✅ Database migration completed successfully.');
      console.log('Next Step: Run "node scripts/migrate-media.mjs" to copy Cloudinary media assets.');
    }
  } catch (err) {
    console.error('\n❌ Migration failed with error:', err);
    process.exit(1);
  } finally {
    await oldClient.close();
    if (newClient) await newClient.close();
  }
}

runDatabaseMigration();
