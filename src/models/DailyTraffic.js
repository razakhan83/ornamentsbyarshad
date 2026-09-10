import mongoose from 'mongoose';

const CityTrafficSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'Pakistan' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    count: { type: Number, default: 1 },
  },
  { _id: false }
);

const DailyTrafficSchema = new mongoose.Schema(
  {
    // Date string formatted as 'YYYY-MM-DD' for ultra-fast indexing and querying
    date: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    totalVisits: {
      type: Number,
      default: 0,
    },
    cities: [CityTrafficSchema],
  },
  {
    timestamps: true,
  }
);

// Prevent multiple model compilation during Next.js hot-reload
export default mongoose.models.DailyTraffic || mongoose.model('DailyTraffic', DailyTrafficSchema);
