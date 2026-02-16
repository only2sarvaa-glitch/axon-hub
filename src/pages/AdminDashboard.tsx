import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, CheckCircle, XCircle, Building2, AlertTriangle } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) { navigate("/auth/admin"); return; }
      setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth/admin");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const stats = [
    { label: "Pending Approvals", value: "0", icon: AlertTriangle },
    { label: "Active Organizers", value: "0", icon: Building2 },
    { label: "Total Events", value: "0", icon: CheckCircle },
    { label: "Complaints", value: "0", icon: XCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50">
        <span className="font-mono text-lg font-bold tracking-[0.3em] text-foreground">AXON</span>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            ADMIN
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mb-8">Platform management</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {stats.map((s) => (
              <div key={s.label} className="p-6 rounded-lg bg-card border border-border">
                <s.icon className="w-5 h-5 text-muted-foreground mb-3" />
                <p className="text-2xl font-bold font-mono">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold mb-4">Pending Organizer Approvals</h2>
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">No pending approvals</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
