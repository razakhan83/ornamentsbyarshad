import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import Feedback from '@/models/Feedback';
import Notification from '@/models/Notification';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req) {
  try {
    const body = await req.json();
    const { rating = 5, type = 'experience', message, suggestions, name, contact } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please enter your feedback or experience.' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const senderName = name?.trim() || session?.user?.name || 'Visitor';
    const senderContact = contact?.trim() || session?.user?.email || '';

    await mongooseConnect();

    const newFeedback = await Feedback.create({
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      type: ['experience', 'suggestion', 'feature-request', 'bug', 'general'].includes(type) ? type : 'experience',
      message: message.trim(),
      suggestions: suggestions?.trim() || '',
      name: senderName,
      contact: senderContact,
      status: 'new',
    });

    // Notify Admin of website feedback
    try {
      await Notification.create({
        type: 'general',
        message: `New Website Feedback (${rating}★): ${senderName} submitted feedback / suggestions.`,
        link: '/admin/feedback',
        metadata: {
          feedbackId: newFeedback._id.toString(),
          senderName,
          rating,
          type,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to create feedback notification:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your feedback helps us improve Ornaments by Arshad.',
      data: newFeedback,
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
