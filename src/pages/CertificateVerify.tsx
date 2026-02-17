import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, XCircle, Upload, Shield, FileText, ExternalLink, Hexagon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FloatingDots from "@/components/FloatingDots";

const CertificateVerify = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState<"file" | "id">("id");
  const [certificateId, setCertificateId] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<null | "verified" | "fake">(null);
  const [certDetails, setCertDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [blockchainVerified, setBlockchainVerified] = useState<boolean | null>(null);
  const [verifyingOnChain, setVerifyingOnChain] = useState(false);

  const handleVerifyById = async () => {
    setLoading(true);
    setVerificationResult(null);
    setCertDetails(null);
    setBlockchainVerified(null);

    const { data } = await supabase
      .from("certificates")
      .select("*")
      .eq("axon_id", certificateId.trim())
      .limit(1);

    if (data && data.length > 0) {
      setVerificationResult("verified");
      setCertDetails(data[0]);
      // Try on-chain verification
      if (data[0].blockchain_tx && data[0].hash) {
        await verifyOnChain(data[0].blockchain_tx, data[0].hash);
      }
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
    setBlockchainVerified(null);

    const buffer = await uploadedFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { data } = await supabase
      .from("certificates")
      .select("*")
      .eq("hash", hashHex)
      .limit(1);

    if (data && data.length > 0) {
      setVerificationResult("verified");
      setCertDetails(data[0]);
      if (data[0].blockchain_tx && data[0].hash) {
        await verifyOnChain(data[0].blockchain_tx, data[0].hash);
      }
    } else {
      setVerificationResult("fake");
    }
    setLoading(false);
  };

  const verifyOnChain = async (txHash: string, certHash: string) => {
    setVerifyingOnChain(true);
    try {
      const { data, error } = await supabase.functions.invoke("polygon-certificate", {
        body: { action: "verify", tx_hash: txHash, certificate_hash: certHash },
      });
      if (error) throw error;
      setBlockchainVerified(data?.verified === true);
    } catch (err) {
      console.error("On-chain verification error:", err);
      setBlockchainVerified(null);
    }
    setVerifyingOnChain(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "id") await handleVerifyById();
    else await handleVerifyByFile();
  };

  const getPolygonScanLink = (tx: string | null) => {
    if (!tx) return null;
    return `https://amoy.polygonscan.com/tx/${tx}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <FloatingDots />

      <nav className="flex items-center px-8 py-6 border-b border-border/50 relative z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-mono text-xs tracking-wider gap-2">
          <ArrowLeft className="w-4 h-4" /> BACK
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Hexagon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="font-mono text-sm text-muted-foreground tracking-[0.2em]">VERIFY</span>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-8 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7 text-muted-foreground" />
            <h2 className="text-3xl font-bold tracking-tight">Verify Certificate</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Live blockchain verification on Polygon Amoy Testnet
          </p>
          {/* Polygon badge */}
          <div className="flex items-center gap-2 mb-8">
            <span className="text-[10px] font-mono bg-accent/80 border border-border px-3 py-1 rounded-full text-muted-foreground tracking-wider">
              POLYGON AMOY TESTNET
            </span>
            <a
              href="https://amoy.polygonscan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-1"
            >
              PolygonScan <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Method tabs */}
          <div className="flex gap-1 mb-6 bg-secondary/50 p-1 rounded-xl w-fit">
            {[
              { key: "id" as const, label: "BY AXON ID" },
              { key: "file" as const, label: "UPLOAD PDF" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => { setMethod(m.key); setVerificationResult(null); setCertDetails(null); setBlockchainVerified(null); }}
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
                      <p className="text-xs text-muted-foreground mt-1 font-mono">Content-based SHA256 hash verification</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full mt-6 font-mono bg-foreground text-background hover:bg-foreground/90" disabled={loading}>
              {loading ? "VERIFYING ON POLYGON..." : "VERIFY CERTIFICATE"}
            </Button>
          </form>

          {/* Result */}
          {verificationResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-8 p-6 rounded-xl border text-center ${
                verificationResult === "verified"
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              {verificationResult === "verified" ? (
                <>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="font-bold text-lg">VERIFIED ✓</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    Certificate hash matched in database
                  </p>

                  {/* Blockchain verification status */}
                  <div className="mt-3 flex items-center justify-center gap-2">
                    {verifyingOnChain ? (
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Verifying on Polygon...
                      </span>
                    ) : blockchainVerified === true ? (
                      <span className="text-xs font-mono text-green-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> ON-CHAIN VERIFIED ⛓️
                      </span>
                    ) : blockchainVerified === false ? (
                      <span className="text-xs font-mono text-yellow-500 flex items-center gap-1">
                        ⚠️ On-chain data mismatch
                      </span>
                    ) : certDetails?.blockchain_tx ? (
                      <span className="text-xs font-mono text-muted-foreground">
                        On-chain check unavailable
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-muted-foreground">
                        Issued before blockchain integration
                      </span>
                    )}
                  </div>

                  {certDetails && (
                    <div className="mt-4 text-left bg-background/50 rounded-lg p-4 space-y-2 text-xs font-mono">
                      <p><span className="text-muted-foreground">Axon ID:</span> {certDetails.axon_id}</p>
                      <p><span className="text-muted-foreground">Type:</span> {certDetails.certificate_type}</p>
                      <p><span className="text-muted-foreground">SHA256:</span> {certDetails.hash?.substring(0, 32)}...</p>
                      {certDetails.blockchain_tx && (
                        <p className="flex items-center gap-2">
                          <span className="text-muted-foreground">Polygon TX:</span>
                          <a
                            href={getPolygonScanLink(certDetails.blockchain_tx)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:underline flex items-center gap-1"
                          >
                            {certDetails.blockchain_tx.substring(0, 20)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </p>
                      )}
                      <p><span className="text-muted-foreground">Network:</span> Polygon Amoy Testnet</p>
                      <p><span className="text-muted-foreground">Issued:</span> {new Date(certDetails.created_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <p className="font-bold text-lg">NOT VERIFIED</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    No matching record found on database or Polygon blockchain
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
