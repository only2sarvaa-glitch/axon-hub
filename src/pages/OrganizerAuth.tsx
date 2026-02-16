import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const OrganizerAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    college_name: "",
    club_name: "",
    college_code: "",
    club_email: "",
    official_email: "",
    contact: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.club_email || form.official_email,
      password: form.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/organizer/dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.club_email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          college_name: form.college_name,
          club_name: form.club_name,
          college_code: form.college_code,
          official_email: form.official_email,
          contact: form.contact,
          role: "organizer",
        },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Registration submitted", description: "Your request is pending admin approval." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center px-8 py-6 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-mono text-xs tracking-wider gap-2">
          <ArrowLeft className="w-4 h-4" /> BACK
        </Button>
        <span className="ml-auto font-mono text-sm text-muted-foreground tracking-[0.2em]">ORGANIZER</span>
      </nav>

      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <h2 className="text-3xl font-bold mb-2 tracking-tight">
            {isLogin ? "Organizer login" : "Register your club"}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {isLogin ? "Sign in to manage your hackathons" : "Registration requires admin approval"}
          </p>

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label className="text-xs font-mono tracking-wider text-muted-foreground">COLLEGE NAME</Label>
                  <Input name="college_name" value={form.college_name} onChange={handleChange} required className="mt-1 bg-card border-border" />
                </div>
                <div>
                  <Label className="text-xs font-mono tracking-wider text-muted-foreground">CLUB NAME</Label>
                  <Input name="club_name" value={form.club_name} onChange={handleChange} required className="mt-1 bg-card border-border" />
                </div>
                <div>
                  <Label className="text-xs font-mono tracking-wider text-muted-foreground">COLLEGE CODE</Label>
                  <Input name="college_code" value={form.college_code} onChange={handleChange} required className="mt-1 bg-card border-border" />
                </div>
                <div>
                  <Label className="text-xs font-mono tracking-wider text-muted-foreground">OFFICIAL COLLEGE EMAIL</Label>
                  <Input name="official_email" type="email" value={form.official_email} onChange={handleChange} required className="mt-1 bg-card border-border" />
                </div>
                <div>
                  <Label className="text-xs font-mono tracking-wider text-muted-foreground">CONTACT NUMBER</Label>
                  <Input name="contact" value={form.contact} onChange={handleChange} required className="mt-1 bg-card border-border" />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs font-mono tracking-wider text-muted-foreground">
                {isLogin ? "EMAIL" : "CLUB EMAIL"}
              </Label>
              <Input
                name="club_email"
                type="email"
                value={form.club_email}
                onChange={handleChange}
                required
                className="mt-1 bg-card border-border"
              />
            </div>
            <div>
              <Label className="text-xs font-mono tracking-wider text-muted-foreground">PASSWORD</Label>
              <Input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} className="mt-1 bg-card border-border" />
            </div>

            <Button type="submit" variant="hero" size="xl" className="w-full mt-6" disabled={loading}>
              {loading ? "Processing..." : isLogin ? "SIGN IN" : "SUBMIT FOR APPROVAL"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Need to register?" : "Already registered?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-foreground underline underline-offset-4">
              {isLogin ? "Register" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default OrganizerAuth;
