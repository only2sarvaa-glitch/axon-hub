import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const StudentAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    college: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/student/dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          name: form.name,
          college: form.college,
          phone: form.phone,
          role: "student",
        },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a verification link." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center px-8 py-6 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-mono text-xs tracking-wider gap-2">
          <ArrowLeft className="w-4 h-4" /> BACK
        </Button>
        <span className="ml-auto font-mono text-sm text-muted-foreground tracking-[0.2em]">STUDENT</span>
      </nav>

      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <h2 className="text-3xl font-bold mb-2 tracking-tight">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {isLogin ? "Sign in with your email or Axon ID" : "Register to get your unique Axon ID"}
          </p>

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label className="text-xs font-mono tracking-wider text-muted-foreground">NAME</Label>
                  <Input name="name" value={form.name} onChange={handleChange} required className="mt-1 bg-card border-border" />
                </div>
                <div>
                  <Label className="text-xs font-mono tracking-wider text-muted-foreground">COLLEGE</Label>
                  <Input name="college" value={form.college} onChange={handleChange} required className="mt-1 bg-card border-border" />
                </div>
                <div>
                  <Label className="text-xs font-mono tracking-wider text-muted-foreground">PHONE</Label>
                  <Input name="phone" value={form.phone} onChange={handleChange} required className="mt-1 bg-card border-border" />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs font-mono tracking-wider text-muted-foreground">EMAIL</Label>
              <Input name="email" type="email" value={form.email} onChange={handleChange} required className="mt-1 bg-card border-border" />
            </div>
            <div>
              <Label className="text-xs font-mono tracking-wider text-muted-foreground">PASSWORD</Label>
              <Input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} className="mt-1 bg-card border-border" />
            </div>

            <Button type="submit" variant="hero" size="xl" className="w-full mt-6" disabled={loading}>
              {loading ? "Processing..." : isLogin ? "SIGN IN" : "REGISTER"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-foreground underline underline-offset-4 hover:text-foreground/80">
              {isLogin ? "Register" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default StudentAuth;
