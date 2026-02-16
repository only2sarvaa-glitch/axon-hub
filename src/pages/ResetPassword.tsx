import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check if this is a recovery flow from URL hash
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Failed to reset password", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      setTimeout(() => navigate("/"), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center px-8 py-6 border-b border-border/40">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-mono text-[11px] tracking-[0.15em] gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> BACK
        </Button>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground/60 tracking-[0.25em]">RESET PASSWORD</span>
      </nav>

      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-[420px]"
        >
          {success ? (
            <div className="text-center">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                <CheckCircle className="w-16 h-16 text-success mx-auto mb-6" strokeWidth={1} />
              </motion.div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Password Updated</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to the homepage...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <Lock className="w-8 h-8 text-muted-foreground/40 mb-5" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold tracking-tight mb-2">Set new password</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter your new password below. Must be at least 6 characters.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">NEW PASSWORD</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">CONFIRM PASSWORD</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="w-full h-12 font-mono text-xs tracking-[0.15em] bg-foreground text-background hover:bg-foreground/90 transition-all mt-2" disabled={loading}>
                  {loading ? "UPDATING..." : "UPDATE PASSWORD"}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default ResetPassword;
