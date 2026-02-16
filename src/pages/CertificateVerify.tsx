import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, XCircle, Upload, Link as LinkIcon, Shield, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CertificateVerify = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState<"file" | "id">("id");
  const [certificateId, setCertificateId] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<null | "verified" | "fake">(null);
  const [certDetails, setCertDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleVerifyById = async () => {
    setLoading(true);
    setVerificationResult(null);
    setCertDetails(null);

    const { data } = await supabase
      .from("certificates")
      .select("*")
      .eq("axon_id", certificateId.trim())
      .limit(1);

    if (data && data.length > 0) {
      setVerificationResult("verified");
      setCertDetails(data[0]);
    } else {
      setVerificationResult("fake");
    }
    setLoading(false);
  };

  const handleVerifyByFile = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setVerificationResult(null);
    setCertDetails(null);

    // Generate SHA256 hash of uploaded file
    const buffer = await uploadedFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Search for matching hash
    const { data } = await supabase
      .from("certificates")
      .select("*")
      .eq("hash", hashHex)
      .limit(1);

    if (data && data.length > 0) {
      setVerificationResult("verified");
      setCertDetails(data[0]);
    } else {
      setVerificationResult("fake");
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "id") await handleVerifyById();
    else await handleVerifyByFile();
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
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7 text-muted-foreground" />
            <h2 className="text-3xl font-bold tracking-tight">Verify Certificate</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Blockchain-powered SHA256 hash verification on Polygon
          </p>

          {/* Method tabs */}
          <div className="flex gap-1 mb-6 bg-secondary/50 p-1 rounded-xl w-fit">
            {[
              { key: "id" as const, label: "BY AXON ID" },
              { key: "file" as const, label: "UPLOAD PDF" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => { setMethod(m.key); setVerificationResult(null); setCertDetails(null); }}
                className={`px-5 py-2 rounded-lg text-xs font-mono tracking-wider transition-all ${
                  method === m.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {method === "id" && (
              <div>
                <Label className="text-xs font-mono tracking-wider text-muted-foreground">STUDENT AXON ID</Label>
                <Input
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value)}
                  placeholder="AXN-A1B2C3D4"
                  required
                  className="mt-1 bg-card border-border font-mono"
                />
              </div>
            )}
            {method === "file" && (
              <div>
                <Label className="text-xs font-mono tracking-wider text-muted-foreground">CERTIFICATE PDF</Label>
                <div className="mt-1 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-foreground/20 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    required
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-6 h-6 text-foreground" />
                      <span className="text-sm font-mono">{uploadedFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Drop certificate PDF here</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">SHA256 hash will be computed & matched</p>
                    </>
                  )}
                </div>
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
              className={`mt-8 p-6 rounded-xl border text-center ${
                verificationResult === "verified"
                  ? "border-success/30 bg-success/5"
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              {verificationResult === "verified" ? (
                <>
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="font-bold text-lg">VERIFIED ✓</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    Certificate hash matches blockchain record
                  </p>
                  {certDetails && (
                    <div className="mt-4 text-left bg-background/50 rounded-lg p-4 space-y-2 text-xs font-mono">
                      <p><span className="text-muted-foreground">Axon ID:</span> {certDetails.axon_id}</p>
                      <p><span className="text-muted-foreground">Type:</span> {certDetails.certificate_type}</p>
                      <p><span className="text-muted-foreground">Hash:</span> {certDetails.hash?.substring(0, 32)}...</p>
                      <p><span className="text-muted-foreground">Blockchain TX:</span> {certDetails.blockchain_tx?.substring(0, 32)}...</p>
                      <p><span className="text-muted-foreground">Issued:</span> {new Date(certDetails.created_at).toLocaleDateString()}</p>
                    </div>
                  )}
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
