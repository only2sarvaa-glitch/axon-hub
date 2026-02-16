import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Search, Calendar, Award, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [axonId, setAxonId] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth/student");
        return;
      }
      setUser(session.user);
      // Generate Axon ID from user id
      setAxonId("AXN-" + session.user.id.substring(0, 8).toUpperCase());
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth/student");
      else {
        setUser(session.user);
        setAxonId("AXN-" + session.user.id.substring(0, 8).toUpperCase());
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const tabs = [
    { icon: Search, label: "Browse Hackathons" },
    { icon: Calendar, label: "My Events" },
    { icon: Award, label: "Certificates" },
    { icon: MessageSquare, label: "Chats" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50">
        <span className="font-mono text-lg font-bold tracking-[0.3em] text-foreground">AXON</span>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            {axonId}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">
            Welcome, {user?.user_metadata?.name || "Student"}
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Your Axon ID: <span className="font-mono text-foreground">{axonId}</span>
          </p>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card border border-border hover:border-foreground/20 transition-all group"
              >
                <tab.icon className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-xs font-mono tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                  {tab.label.toUpperCase()}
                </span>
              </button>
            ))}
          </div>

          {/* Hackathon search */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Upcoming Hackathons</h2>
            <Input
              placeholder="Search by name, college code..."
              className="bg-card border-border max-w-md mb-6"
            />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-foreground/20 transition-all"
                >
                  <div>
                    <p className="font-semibold text-sm">Hackathon #{i}</p>
                    <p className="text-xs text-muted-foreground font-mono">Coming soon</p>
                  </div>
                  <Button variant="outline" size="sm" className="font-mono text-xs">
                    VIEW
                  </Button>
                </div>
              ))}
              <p className="text-center text-xs text-muted-foreground py-4 font-mono">
                No hackathons listed yet. Check back soon.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default StudentDashboard;
