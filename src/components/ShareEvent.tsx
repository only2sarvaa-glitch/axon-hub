import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ShareEvent = ({ hackathonName, hackathonId }: { hackathonName: string; hackathonId: string }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/verify?event=${hackathonId}`;
  const shareText = `Check out "${hackathonName}" on AXON! ${shareUrl}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: hackathonName, text: `Join "${hackathonName}" on AXON`, url: shareUrl });
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button variant="outline" size="sm" className="font-mono text-[10px]" onClick={handleShare}>
      {copied ? <Check className="w-3 h-3 mr-1" /> : <Share2 className="w-3 h-3 mr-1" />}
      {copied ? "COPIED" : "SHARE"}
    </Button>
  );
};
