import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminAuth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/admin/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center px-8 py-6 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="font-mono text-xs tracking-wider gap-2">
          <ArrowLeft className="w-4 h-4" /> BACK
        </Button>
        <span className="ml-auto font-mono text-sm text-muted-foreground tracking-[0.2em]">ADMIN</span>
      </nav>

      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-muted-foreground" />
            <h2 className="text-3xl font-bold tracking-tight">Admin access</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Platform administration login
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-xs font-mono tracking-wider text-muted-foreground">EMAIL</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 bg-card border-border" />
            </div>
            <div>
              <Label className="text-xs font-mono tracking-wider text-muted-foreground">PASSWORD</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 bg-card border-border" />
            </div>
            <Button type="submit" variant="hero" size="xl" className="w-full mt-6" disabled={loading}>
              {loading ? "Authenticating..." : "AUTHENTICATE"}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminAuth;
