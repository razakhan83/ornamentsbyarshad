import { Suspense } from 'react';
import { requireAdmin } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import Feedback from '@/models/Feedback';
import AdminFeedbackClient from './AdminFeedbackClient';

export const metadata = {
  title: 'Website Feedback & Suggestions | Admin',
};

export default async function AdminFeedbackPage() {
  await requireAdmin();
  await mongooseConnect();

  const [items, total, allDocs] = await Promise.all([
    Feedback.find().sort({ createdAt: -1 }).limit(25).lean(),
    Feedback.countDocuments(),
    Feedback.find({}, 'status rating type').lean(),
  ]);

  // Aggregate stats
  const totalAll = allDocs.length;
  let newCount = 0;
  let readCount = 0;
  let archivedCount = 0;
  let sumRating = 0;
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const typeCounts = { experience: 0, suggestion: 0, 'feature-request': 0, bug: 0, general: 0 };

  for (const doc of allDocs) {
    if (doc.status === 'new') newCount++;
    else if (doc.status === 'read') readCount++;
    else if (doc.status === 'archived') archivedCount++;

    const r = Math.min(5, Math.max(1, Math.round(doc.rating || 5)));
    ratingCounts[r] = (ratingCounts[r] || 0) + 1;
    sumRating += doc.rating || 5;

    const t = doc.type || 'experience';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  const avgRating = totalAll > 0 ? (sumRating / totalAll).toFixed(1) : '5.0';

  const summary = {
    totalAll,
    newCount,
    readCount,
    archivedCount,
    avgRating,
    ratingCounts,
    typeCounts,
  };

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading feedback...</div>}>
      <AdminFeedbackClient
        initialFeedbacks={JSON.parse(JSON.stringify(items || []))}
        summary={summary}
        total={total}
        totalPages={Math.ceil(total / 25) || 1}
        currentPage={1}
      />
    </Suspense>
  );
}
