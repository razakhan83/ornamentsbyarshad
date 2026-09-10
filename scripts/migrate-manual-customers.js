import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually to avoid dotenv dependency
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
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
} catch (e) {
  console.log('No .env.local found or error parsing it');
}

// Setup schemas locally to avoid next.js import issues
const OrderSchema = new mongoose.Schema({
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  customerAddress: String,
  customerCity: String,
  createdAt: Date
}, { strict: false });

const ManualCustomerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  address: String,
  city: String
}, { timestamps: true });

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
  const ManualCustomer = mongoose.models.ManualCustomer || mongoose.model('ManualCustomer', ManualCustomerSchema);

  console.log('Fetching orders...');
  // We process orders in ascending order so the most recent order overwrites older data
  const orders = await Order.find({ customerPhone: { $exists: true, $ne: null } }).sort({ createdAt: 1 }).lean();
  
  console.log(`Found ${orders.length} orders to process.`);

  const customerMap = new Map();

  for (const order of orders) {
    if (!order.customerPhone) continue;
    
    // Clean phone number (basic)
    const phone = String(order.customerPhone).trim();
    if (phone.length < 5) continue;

    customerMap.set(phone, {
      name: order.customerName || '',
      phone: phone,
      email: order.customerEmail || '',
      address: order.customerAddress || '',
      city: order.customerCity || ''
    });
  }

  console.log(`Found ${customerMap.size} unique customers.`);
  console.log('Upserting to ManualCustomer collection...');

  let count = 0;
  for (const [phone, data] of customerMap.entries()) {
    if (!data.name) continue;

    await ManualCustomer.updateOne(
      { phone },
      { $set: data },
      { upsert: true }
    );
    count++;
    if (count % 100 === 0) {
      console.log(`Upserted ${count} customers...`);
    }
  }

  console.log(`Migration complete! Successfully migrated ${count} unique manual customers.`);
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
