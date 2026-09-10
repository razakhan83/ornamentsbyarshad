'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquarePlus, Check, Loader2 } from 'lucide-react';
import { submitFeedbackAction } from '@/app/actions/feedback.actions';

export default function SuggestionsModal() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    type: 'product-request',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-suggestions', handleOpen);
    return () => window.removeEventListener('open-suggestions', handleOpen);
  }, []);

  const types = [
    { value: 'product-request', label: 'Product Request' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'general', label: 'General Feedback' },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contact.trim() || !formData.message.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await submitFeedbackAction(formData);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setFormData({ name: '', contact: '', type: 'product-request', message: '' });
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 2500);
    } else {
      setError(res.error || 'Failed to submit. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[92vw] rounded-2xl p-5 sm:max-w-md sm:p-6 md:p-8" hideClose={false}>
        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-300">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Thank You!</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              We have received your suggestion/request. Our team will review it and get in touch if needed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquarePlus className="size-5 shrink-0" />
                <DialogTitle className="text-[1.3rem] font-bold tracking-tight">
                  Requests & Suggestions
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs sm:text-sm">
                Help us improve! Share what products you want us to import or suggest updates for our website.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive animate-in fade-in">
                {error}
              </div>
            )}

            <div className="space-y-3.5">
              {/* Type Select buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {types.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t.value })}
                      className={[
                        'py-2 px-1 text-center rounded-lg border text-[11px] sm:text-xs font-semibold transition active:scale-[0.98]',
                        formData.type === t.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background hover:bg-muted text-muted-foreground',
                      ].join(' ')}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="feedback-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
                <Input
                  id="feedback-name"
                  type="text"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-10 sm:h-11 rounded-lg border-border"
                  required
                />
              </div>

              {/* Contact Input */}
              <div className="space-y-1.5">
                <label htmlFor="feedback-contact" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp / Email</label>
                <Input
                  id="feedback-contact"
                  type="text"
                  placeholder="e.g. 03001234567 or email@domain.com"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="h-10 sm:h-11 rounded-lg border-border"
                  required
                />
              </div>

              {/* Message Input */}
              <div className="space-y-1.5">
                <label htmlFor="feedback-message" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Message</label>
                <Textarea
                  id="feedback-message"
                  placeholder="Tell us what you want to request or suggest..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="min-h-24 sm:min-h-28 rounded-lg border-border resize-none"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 sm:h-11 rounded-lg font-bold text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
