'use client';

import { useState, useEffect } from 'react';
import { Star, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const RATING_LABELS = {
  1: 'Needs improvement',
  2: 'Fair experience',
  3: 'Good, but could be better',
  4: 'Great experience',
  5: 'Loved everything!',
};

const CATEGORIES = [
  { id: 'experience', label: 'Experience' },
  { id: 'suggestion', label: 'Suggestion' },
  { id: 'feature-request', label: 'Feature' },
  { id: 'bug', label: 'Issue / Bug' },
];

export default function WebsiteFeedbackModal({ open, onOpenChange }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [type, setType] = useState('experience');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      const originalBody = document.body.style.overflow;
      const originalHtml = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalBody;
        document.documentElement.style.overflow = originalHtml;
      };
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter your feedback.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          type,
          name,
          message,
          suggestions,
          contact,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        toast.success('Feedback submitted. Thank you!');
        setTimeout(() => {
          setSubmitted(false);
          setName('');
          setMessage('');
          setSuggestions('');
          setContact('');
          setRating(5);
          onOpenChange(false);
        }, 1800);
      } else {
        toast.error(data.error || 'Failed to submit feedback.');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentRating = hoverRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-28px)] sm:max-w-lg md:max-w-[560px] p-0 gap-0 overflow-hidden rounded-sm border border-gray-200/90 bg-white shadow-2xl z-[500] font-sans">
        
        {/* Header */}
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-3.5 sm:pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Website Feedback
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Help us make Ornaments by Arshad faster, easier, and better for you.
            </DialogDescription>
          </div>
        </div>

        {submitted ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="size-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Check className="size-6 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Thank you for your feedback!</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              We carefully review every suggestion to improve your shopping experience.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="p-5 sm:p-7 space-y-4.5 sm:space-y-5 max-h-[72vh] overflow-y-auto overscroll-contain">
              
              {/* Star Rating Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Overall Experience
                  </label>
                  <span className="text-[11px] font-medium text-gray-500">
                    {RATING_LABELS[currentRating]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 py-2 px-3 rounded-sm bg-gray-50/90 border border-gray-100 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 sm:p-1.5 transition-transform hover:scale-115 active:scale-95 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={cn(
                          'size-6 sm:size-7 transition-colors',
                          currentRating >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-gray-200 text-gray-200'
                        )}
                        strokeWidth={1}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Segmented Control - 2 cols on mobile, 4 in single row on PC */}
              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                  Feedback Topic
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-gray-100/80 rounded-sm">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setType(cat.id)}
                      className={cn(
                        'py-1.5 px-2.5 text-xs rounded-sm transition-all text-center truncate cursor-pointer',
                        type === cat.id
                          ? 'bg-white text-gray-900 font-bold shadow-xs'
                          : 'text-gray-600 font-medium hover:text-gray-900'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Comments */}
              <div>
                <label htmlFor="fb-message" className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                  Your Comments <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="fb-message"
                  placeholder="Tell us what you liked or what needs improvement..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[85px] sm:min-h-[95px] text-xs sm:text-sm resize-none rounded-sm border-gray-200 focus-visible:ring-primary"
                  required
                />
              </div>

              {/* Optional Suggestions */}
              <div>
                <label htmlFor="fb-suggestions" className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                  What to add <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <Input
                  id="fb-suggestions"
                  placeholder="Products, categories, or features you'd like us to add..."
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  className="h-10 text-xs sm:text-sm rounded-sm border-gray-200 focus-visible:ring-primary"
                />
              </div>

              {/* 2-Column Inputs on PC (Name & Contact) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label htmlFor="fb-name" className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                    Your Name <span className="text-gray-400 font-normal lowercase">(optional)</span>
                  </label>
                  <Input
                    id="fb-name"
                    placeholder="Your name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-sm border-gray-200 focus-visible:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="fb-contact" className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                    WhatsApp / Email <span className="text-gray-400 font-normal lowercase">(optional)</span>
                  </label>
                  <Input
                    id="fb-contact"
                    placeholder="For follow-up / reply..."
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-sm border-gray-200 focus-visible:ring-primary"
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="rounded-sm h-10 px-4 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !message.trim()}
                className="rounded-sm h-10 px-5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  'Send Feedback'
                )}
              </Button>
            </div>
          </form>
        )}

      </DialogContent>
    </Dialog>
  );
}
