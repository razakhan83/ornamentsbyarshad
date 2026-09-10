"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Upload, Download, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function BulkImportModal({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleDownloadSample = () => {
    const csvContent = "Name,Price,Category,ImageUrl\nMen's Cotton Shirt,2500,\"Men's Wear, Shirts\",https://res.cloudinary.com/your-cloud-name/image/upload/sample1.jpg";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "product_import_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/products/bulk-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload products");
      }

      setResult({ success: true, message: data.message, count: data.count });
      toast.success(`Imported ${data.count} products successfully!`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      setTimeout(() => {
        onOpenChange(false);
        setFile(null);
        setResult(null);
      }, 2500);

    } catch (error) {
      setResult({ success: false, message: error.message });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) {
        setFile(null);
        setResult(null);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Product Import</DialogTitle>
          <DialogDescription>
            Upload a .csv or .xlsx file to bulk import products. Products will be added as &quot;Draft&quot; by default.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-muted/20">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            
            <p className="text-sm font-medium mb-1">Select a CSV or Excel file</p>
            <p className="text-xs text-muted-foreground mb-4 text-center">
              Columns required: Name, Price, Category, ImageUrl
            </p>
            
            <Input 
              type="file" 
              accept=".csv, .xlsx" 
              onChange={handleFileChange}
              className="max-w-[250px]"
              disabled={loading}
            />

            {file && (
              <div className="mt-4 flex items-center gap-2 text-sm text-foreground bg-background px-3 py-2 rounded-md border">
                <FileText className="h-4 w-4" />
                <span className="truncate max-w-[150px]">{file.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Need a template?</p>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80">Download our sample CSV file to see the correct format.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadSample} className="shrink-0 h-8 text-xs bg-white dark:bg-transparent">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Template
            </Button>
          </div>

          {result && (
            <div className={`p-4 rounded-lg flex gap-3 text-sm border ${result.success ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900'}`}>
              {result.success ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <div>{result.message}</div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? "Importing..." : "Start Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
