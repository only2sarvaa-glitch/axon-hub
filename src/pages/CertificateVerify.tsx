import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, XCircle, Upload, Link as LinkIcon } from "lucide-react";

const CertificateVerify = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState<"file" | "link" | "id">("id");
  const [certificateId, setCertificateId] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [verificationResult, setVerificationResult] = useState<null | "verified" | "fake">(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock verification - will connect to blockchain later
    await new Promise((r) => setTimeout(r, 2000));
    setVerificationResult(certificateId || driveLink ? "verified" : "fake");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center px-8 py-6 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-mono text-xs tracking-wider gap-2">
          <ArrowLeft className="w-4 h-4" /> BACK
        </Button>
        <span className="ml-auto font-mono text-sm text-muted-foreground tracking-[0.2em]">VERIFY</span>
      </nav>

      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <h2 className="text-3xl font-bold mb-2 tracking-tight">Certificate Verification</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Verify any AXON certificate using blockchain hash matching
          </p>

          {/* Method tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { key: "id" as const, label: "Certificate ID" },
              { key: "link" as const, label: "Drive Link" },
              { key: "file" as const, label: "Upload PDF" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => { setMethod(m.key); setVerificationResult(null); }}
                className={`px-4 py-2 rounded-md text-xs font-mono tracking-wider transition-all ${
                  method === m.key
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label.toUpperCase()}
              </button>
            ))}
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {method === "id" && (
              <div>
                <Label className="text-xs font-mono tracking-wider text-muted-foreground">CERTIFICATE ID</Label>
                <Input
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value)}
                  placeholder="AXON-CERT-XXXXXXXX"
                  required
                  className="mt-1 bg-card border-border font-mono"
                />
              </div>
            )}
            {method === "link" && (
              <div>
                <Label className="text-xs font-mono tracking-wider text-muted-foreground">GOOGLE DRIVE LINK</Label>
                <div className="relative mt-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    required
                    className="pl-10 bg-card border-border"
                  />
                </div>
              </div>
            )}
            {method === "file" && (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-foreground/20 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Drop certificate PDF here</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">or click to browse</p>
              </div>
            )}

            <Button type="submit" variant="hero" size="xl" className="w-full mt-6" disabled={loading}>
              {loading ? "VERIFYING ON BLOCKCHAIN..." : "VERIFY CERTIFICATE"}
            </Button>
          </form>

          {/* Result */}
          {verificationResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-8 p-6 rounded-lg border text-center ${
                verificationResult === "verified"
                  ? "border-success/30 bg-success/5"
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              {verificationResult === "verified" ? (
                <>
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="font-bold text-lg">VERIFIED</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    Certificate hash matches blockchain record
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <p className="font-bold text-lg">NOT VERIFIED</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    No matching record found on blockchain
                  </p>
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default CertificateVerify;
