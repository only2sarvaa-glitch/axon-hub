import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, GraduationCap, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type View = "login" | "register" | "forgot";

const StudentAuth = () => {
  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", college: "", email: "", phone: "", password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    });
    setLoading(false);
    if (error) toast({ title: "Login failed", description: error.message, variant: "destructive" });
    else navigate("/student/dashboard");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name: form.name, college: form.college, phone: form.phone, role: "student" },
      },
    });
    setLoading(false);
    if (error) toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    else toast({ title: "Check your email", description: "We sent you a verification link." });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
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
        <span className="ml-auto font-mono text-[11px] text-muted-foreground/60 tracking-[0.25em]">STUDENT</span>
      </nav>

      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-[420px]"
          >
            {/* Forgot Password View */}
            {view === "forgot" && (
              <>
                <div className="mb-8">
                  <Mail className="w-8 h-8 text-muted-foreground/40 mb-5" strokeWidth={1.5} />
                  <h2 className="text-2xl font-bold tracking-tight mb-2">Reset password</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>
                {resetSent ? (
                  <div className="rounded-xl border border-success/20 bg-success/5 p-6 text-center">
                    <p className="text-sm text-foreground font-medium mb-1">Reset link sent</p>
                    <p className="text-xs text-muted-foreground">Check your inbox for the password reset email.</p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">EMAIL ADDRESS</Label>
                      <Input name="email" type="email" value={form.email} onChange={handleChange} required className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors" placeholder="you@email.com" />
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
            )}

            {/* Login / Register */}
            {view !== "forgot" && (
              <>
                <div className="mb-8">
                  <GraduationCap className="w-8 h-8 text-muted-foreground/40 mb-5" strokeWidth={1.5} />
                  <h2 className="text-2xl font-bold tracking-tight mb-2">
                    {view === "login" ? "Welcome back" : "Create account"}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {view === "login" ? "Sign in to access your dashboard" : "Register to get your unique Axon ID"}
                  </p>
                </div>

                <form onSubmit={view === "login" ? handleLogin : handleRegister} className="space-y-4">
                  <AnimatePresence>
                    {view === "register" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">FULL NAME</Label>
                          <Input name="name" value={form.name} onChange={handleChange} required className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors" placeholder="John Doe" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">COLLEGE</Label>
                          <Input name="college" value={form.college} onChange={handleChange} required className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors" placeholder="Your college name" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">PHONE</Label>
                          <Input name="phone" value={form.phone} onChange={handleChange} required className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors" placeholder="+91 XXXXX XXXXX" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">EMAIL ADDRESS</Label>
                    <Input name="email" type="email" value={form.email} onChange={handleChange} required className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors" placeholder="you@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/80">PASSWORD</Label>
                      {view === "login" && (
                        <button type="button" onClick={() => setView("forgot")} className="text-[10px] font-mono tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                          FORGOT?
                        </button>
                      )}
                    </div>
                    <Input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} className="h-12 bg-card border-border/60 focus:border-foreground/30 transition-colors" placeholder="••••••••" />
                  </div>

                  <Button type="submit" className="w-full h-12 font-mono text-xs tracking-[0.15em] bg-foreground text-background hover:bg-foreground/90 transition-all mt-2" disabled={loading}>
                    {loading ? "PROCESSING..." : view === "login" ? "SIGN IN" : "REGISTER"}
                  </Button>
                </form>

                <div className="flex items-center justify-center mt-8">
                  <div className="h-px bg-border/60 flex-1" />
                  <span className="text-[10px] font-mono text-muted-foreground/50 px-4 tracking-wider">OR</span>
                  <div className="h-px bg-border/60 flex-1" />
                </div>

                <button onClick={() => setView(view === "login" ? "register" : "login")} className="block w-full text-center mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {view === "login" ? "Don't have an account? " : "Already have an account? "}
                  <span className="text-foreground underline underline-offset-4">{view === "login" ? "Register" : "Sign in"}</span>
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default StudentAuth;
