import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.replace(/\\n/gm, '\n');
          value = value.replace(/(^"|"$)/g, '');
        } else if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
          value = value.replace(/(^'|'$)/g, '');
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.log('Error parsing .env.local:', e.message);
}

async function clearTestOrders() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully.');

    const db = mongoose.connection.db;

    // 1. Delete Orders
    const ordersRes = await db.collection('orders').deleteMany({});
    console.log(`📦 Deleted Orders: ${ordersRes.deletedCount}`);

    // 2. Delete Order Logs
    try {
      const logsRes = await db.collection('orderlogs').deleteMany({});
      console.log(`📝 Deleted Order Logs: ${logsRes.deletedCount}`);
    } catch (e) {
      console.log('No orderlogs collection found or skipped.');
    }

    // 3. Delete Invoices
    try {
      const invoicesRes = await db.collection('invoices').deleteMany({});
      console.log(`🧾 Deleted Invoices: ${invoicesRes.deletedCount}`);
    } catch (e) {
      console.log('No invoices collection found or skipped.');
    }

    // 4. Delete Payments
    try {
      const paymentsRes = await db.collection('payments').deleteMany({});
      console.log(`💳 Deleted Payments: ${paymentsRes.deletedCount}`);
    } catch (e) {
      console.log('No payments collection found or skipped.');
    }

    // 5. Reset invoice counter sequence if exists
    try {
      const counterRes = await db.collection('counters').deleteOne({ _id: 'invoice_seq' });
      if (counterRes.deletedCount > 0) {
        console.log('🔄 Reset invoice counter sequence.');
      }
    } catch (e) {
      // ignore
    }

    console.log('\n✨ All test orders and revenue have been successfully cleared!');
  } catch (error) {
    console.error('❌ Error while clearing orders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

clearTestOrders();
