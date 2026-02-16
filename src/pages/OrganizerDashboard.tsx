import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus, Users, Settings } from "lucide-react";

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) { navigate("/auth/organizer"); return; }
      setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth/organizer");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50">
        <span className="font-mono text-lg font-bold tracking-[0.3em] text-foreground">AXON</span>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-muted-foreground">
            {user?.user_metadata?.club_name || "Organizer"}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">Organizer Dashboard</h1>
          <p className="text-muted-foreground text-sm mb-8">
            {user?.user_metadata?.college_name || "Your college"} — {user?.user_metadata?.club_name || "Your club"}
          </p>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <button className="flex items-center gap-4 p-6 rounded-lg bg-card border border-border hover:border-foreground/20 transition-all group">
              <Plus className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div className="text-left">
                <p className="text-sm font-semibold">Create Hackathon</p>
                <p className="text-xs text-muted-foreground">Set up a new event</p>
              </div>
            </button>
            <button className="flex items-center gap-4 p-6 rounded-lg bg-card border border-border hover:border-foreground/20 transition-all group">
              <Users className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div className="text-left">
                <p className="text-sm font-semibold">Manage Teams</p>
                <p className="text-xs text-muted-foreground">Review registrations</p>
              </div>
            </button>
            <button className="flex items-center gap-4 p-6 rounded-lg bg-card border border-border hover:border-foreground/20 transition-all group">
              <Settings className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div className="text-left">
                <p className="text-sm font-semibold">Settings</p>
                <p className="text-xs text-muted-foreground">Club profile & config</p>
              </div>
            </button>
          </div>

          {/* Events list */}
          <h2 className="text-lg font-semibold mb-4">Your Events</h2>
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">No events created yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Create Hackathon" to get started</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default OrganizerDashboard;
