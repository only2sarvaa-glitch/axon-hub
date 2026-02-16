import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Download, FileText, Loader2 } from "lucide-react";

interface FileViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export const FileViewer = ({ url, title, onClose }: FileViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isPdf = url.toLowerCase().includes(".pdf");
  const isImage = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url);
  const isPpt = /\.(ppt|pptx)(\?|$)/i.test(url);

  useEffect(() => {
    let cancelled = false;
    const fetchBlob = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const blob = await res.blob();
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBlob();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = blobUrl || url;
    a.download = title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-mono truncate max-w-[300px]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-mono text-[10px]" onClick={handleDownload} disabled={loading}>
            <Download className="w-3 h-3 mr-1" /> DOWNLOAD
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        {loading ? (
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-muted-foreground mx-auto animate-spin" />
            <p className="text-xs text-muted-foreground font-mono">Loading document...</p>
          </div>
        ) : error ? (
          <div className="text-center space-y-4">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground font-mono">Could not load file preview</p>
            <Button onClick={handleDownload} className="font-mono text-xs">
              <Download className="w-3 h-3 mr-1" /> DOWNLOAD INSTEAD
            </Button>
          </div>
        ) : isPdf && blobUrl ? (
          <iframe
            src={blobUrl}
            className="w-full h-full rounded-lg border border-border"
            title={title}
          />
        ) : isImage && blobUrl ? (
          <img src={blobUrl} alt={title} className="max-w-full max-h-full object-contain rounded-lg" />
        ) : isPpt ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
              className="w-full h-full rounded-lg border border-border"
              title={title}
            />
            <p className="text-[10px] text-muted-foreground font-mono">Powered by Microsoft Office Online Viewer</p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground font-mono">Preview not available for this file type</p>
            <Button onClick={handleDownload} className="font-mono text-xs">
              <Download className="w-3 h-3 mr-1" /> DOWNLOAD FILE
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface FileViewerButtonProps {
  url: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const FileViewerButton = ({ url, title, children, className }: FileViewerButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <AnimatePresence>
        {open && <FileViewer url={url} title={title} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
};
