import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    name: {
      type: String,
      trim: true,
      default: 'Visitor',
    },
    contact: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['experience', 'suggestion', 'feature-request', 'bug', 'general'],
      default: 'experience',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    suggestions: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['new', 'read', 'archived'],
      default: 'new',
    },
  },
  {
    timestamps: true,
  }
);

FeedbackSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);

