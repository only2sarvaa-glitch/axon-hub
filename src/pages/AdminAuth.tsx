import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type View = "login" | "forgot";

const AdminAuth = () => {
  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    else navigate("/admin/dashboard");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setResetSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center px-8 py-6 border-b border-border/40">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-mono text-[11px] tracking-[0.15em] gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> BACK
        </Button>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground/60 tracking-[0.25em]">ADMIN</span>
      </nav>

      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-[420px]"
        >
          {view === "forgot" ? (
            <>
              <div className="mb-8">
                <Mail className="w-8 h-8 text-muted-foreground/40 mb-5" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold tracking-tight mb-2">Reset password</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">Enter your admin email for a reset link.</p>
              </div>
              {resetSent ? (
                <div className="rounded-xl border border-success/20 bg-success/5 p-6 text-center">
                  <p className="text-sm text-foreground font-medium mb-1">Reset link sent</p>
                  <p className="text-xs text-muted-foreground">Check your inbox.</p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">EMAIL ADDRESS</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors" placeholder="admin@email.com" />
                  </div>
                  <Button type="submit" className="w-full h-12 font-mono text-xs tracking-[0.15em] bg-foreground text-background hover:bg-foreground/90" disabled={loading}>
                    {loading ? "SENDING..." : "SEND RESET LINK"}
                  </Button>
                </form>
              )}
              <button onClick={() => { setView("login"); setResetSent(false); }} className="block mx-auto mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Back to sign in
              </button>
            </>
          ) : (
            <>
              <div className="mb-8">
                <Shield className="w-8 h-8 text-muted-foreground/40 mb-5" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold tracking-tight mb-2">Admin access</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">Platform administration login</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">EMAIL ADDRESS</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors" placeholder="admin@email.com" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">PASSWORD</Label>
                    <button type="button" onClick={() => setView("forgot")} className="text-[10px] font-mono tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                      FORGOT?
                    </button>
                  </div>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors" placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full h-12 font-mono text-xs tracking-[0.15em] bg-foreground text-background hover:bg-foreground/90 transition-all mt-2" disabled={loading}>
                  {loading ? "AUTHENTICATING..." : "AUTHENTICATE"}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminAuth;
