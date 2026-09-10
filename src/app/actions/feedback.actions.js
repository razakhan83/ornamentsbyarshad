'use server';

import mongooseConnect from '@/lib/mongooseConnect';
import Feedback from '@/models/Feedback';

export async function submitFeedbackAction(data) {
  try {
    const { name, contact, type, message } = data;
    
    if (!name || !name.trim()) return { success: false, error: 'Name is required' };
    if (!contact || !contact.trim()) return { success: false, error: 'Contact number/email is required' };
    if (!message || !message.trim()) return { success: false, error: 'Message is required' };
    
    await mongooseConnect();
    
    const feedback = await Feedback.create({
      name: name.trim(),
      contact: contact.trim(),
      type: type || 'suggestion',
      message: message.trim(),
    });
    
    return { success: true, feedbackId: feedback._id.toString() };
  } catch (error) {
    console.error('submitFeedbackAction failed:', error);
    return { success: false, error: error.message || 'Something went wrong. Please try again.' };
  }
}
