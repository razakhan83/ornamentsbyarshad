'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SyncNocSheetModal({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select an Excel or CSV file from NOC portal');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/courier/sync-sheet', {
        method: 'POST',
        body: formData,
      });

      let data = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { success: false, error: 'Server returned non-JSON response.' };
      }

      if (res.ok && data.success) {
        toast.success(data.message || `Successfully synced ${data.updatedCount || 0} orders!`);
        onOpenChange(false);
        setFile(null);
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to process NOC sheet');
      }
    } catch (err) {
      console.error('Error uploading sheet:', err);
      toast.error('Network error uploading NOC sheet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) setFile(null);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <FileSpreadsheet className="size-5 text-emerald-600" />
            Sync NOC Loadsheet / Excel
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload the Excel file downloaded from NOC portal (via <strong>&quot;Generate Excel&quot;</strong> button). System will automatically match all Parcel numbers and assign their 3rd Party CNs and Courier names (Leopard, TCS, etc.).
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 flex flex-col gap-4">
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/80 hover:border-emerald-500/60 rounded-xl bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }}
            />
            <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center mb-2.5">
              <Upload className="size-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              {file ? file.name : 'Click to upload NOC Excel file'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .xlsx or .csv from NOC portal'}
            </p>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-lg h-8 text-xs font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={!file || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8 px-4 text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            {loading ? <Spinner className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
            {loading ? 'Syncing...' : 'Sync Orders Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
