'use client';

import { useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import { quickCreateDraftProductAction } from '@/app/actions/invoice.actions';

export default function QuickAddProductModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error('Image size should be less than 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Item name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await quickCreateDraftProductAction({
        name,
        price: Number(sellingPrice) || 0,
        sku,
        description,
        image: imageUrl,
      });

      if (res?.success) {
        toast.success('Item created as website draft & added to invoice!');
        if (onSuccess) onSuccess(res.product);
        handleClose();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSellingPrice('');
    setSku('');
    setDescription('');
    setImageUrl('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">New Item</DialogTitle>
          <DialogDescription>
            Create an unlisted item on-the-fly. Saved as a website Draft and added to active invoice.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <FieldLabel className="text-xs font-semibold uppercase text-red-600">
                Item Name *
              </FieldLabel>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Self Adhesive Hook"
                required
              />
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold uppercase">SKU</FieldLabel>
              <Input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. HK-001"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <FieldLabel className="text-xs font-semibold uppercase text-red-600">
                Selling Price (PKR) *
              </FieldLabel>
              <Input
                type="number"
                min="0"
                step="any"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold uppercase">Item Picture</FieldLabel>
              <div className="relative border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-lg p-3 text-center bg-zinc-50 flex flex-col items-center justify-center min-h-[90px] cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {imageUrl ? (
                  <img src={imageUrl} alt="Preview" className="h-16 object-contain rounded" />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <ImageIcon className="w-5 h-5 text-zinc-400" />
                    <span>Upload Picture</span>
                  </div>
                )}
              </div>
            </Field>
          </div>

          <Field>
            <FieldLabel className="text-xs font-semibold uppercase">Description</FieldLabel>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short item details..."
            />
          </Field>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save & Add to Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
