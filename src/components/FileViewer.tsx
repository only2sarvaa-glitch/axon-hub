import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Download, ExternalLink, FileText } from "lucide-react";

interface FileViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export const FileViewer = ({ url, title, onClose }: FileViewerProps) => {
  const isPdf = url.toLowerCase().includes(".pdf");
  const isImage = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = title;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
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
          <Button variant="outline" size="sm" className="font-mono text-[10px]" onClick={handleDownload}>
            <Download className="w-3 h-3 mr-1" /> DOWNLOAD
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        {isPdf ? (
          <iframe
            src={url}
            className="w-full h-full rounded-lg border border-border"
            title={title}
          />
        ) : isImage ? (
          <img src={url} alt={title} className="max-w-full max-h-full object-contain rounded-lg" />
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
