import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, CheckCircle, XCircle, Building2, AlertTriangle, Users, Calendar, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

interface OrganizerApplication {
  id: string;
  user_id: string;
  college_name: string;
  club_name: string;
  college_code: string;
  club_email: string;
  official_email: string;
  contact: string;
  status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<OrganizerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, organizers: 0, events: 0, students: 0 });

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

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [appsRes, hackRes, profilesRes] = await Promise.all([
      supabase.from("organizer_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("hackathons").select("id"),
      supabase.from("profiles").select("id"),
    ]);

    const apps = appsRes.data || [];
    setApplications(apps);
    setStats({
      pending: apps.filter(a => a.status === "pending").length,
      organizers: apps.filter(a => a.status === "approved").length,
      events: hackRes.data?.length || 0,
      students: profilesRes.data?.length || 0,
    });
    setLoading(false);
  };

  const handleApproval = async (id: string, userId: string, approve: boolean) => {
    const { error } = await supabase
      .from("organizer_applications")
      .update({ status: approve ? "approved" : "rejected", reviewed_by: user.id })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: approve ? "Approved" : "Rejected", description: `Application ${approve ? "approved" : "rejected"} successfully.` });
      fetchData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const statCards = [
    { label: "Pending", value: stats.pending, icon: AlertTriangle, color: "text-warning" },
    { label: "Organizers", value: stats.organizers, icon: Building2, color: "text-foreground" },
    { label: "Events", value: stats.events, icon: Calendar, color: "text-foreground" },
    { label: "Students", value: stats.students, icon: Users, color: "text-foreground" },
  ];

  const pendingApps = applications.filter(a => a.status === "pending");
  const processedApps = applications.filter(a => a.status !== "pending");

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <span className="font-mono text-lg font-bold tracking-[0.3em] text-foreground">AXON</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full">
            <Shield className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">ADMIN</span>
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-1 tracking-tight">Platform Control</h1>
          <p className="text-muted-foreground text-sm mb-10 font-mono tracking-wider">ADMIN DASHBOARD</p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {statCards.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-xl bg-card border border-border hover:border-border/80 transition-all group"
              >
                <s.icon className={`w-5 h-5 ${s.color} mb-3 opacity-60 group-hover:opacity-100 transition-opacity`} />
                <p className="text-3xl font-bold font-mono">{loading ? "—" : s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono tracking-wider">{s.label.toUpperCase()}</p>
              </motion.div>
            ))}
          </div>

          {/* Pending Approvals */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <h2 className="text-xl font-semibold">Pending Approvals</h2>
              <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {pendingApps.length}
              </span>
            </div>

            <AnimatePresence mode="popLayout">
              {pendingApps.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-border bg-card p-12 text-center"
                >
                  <CheckCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground font-mono">All caught up — no pending approvals</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {pendingApps.map((app) => (
                    <motion.div
                      key={app.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-5 rounded-xl bg-card border border-border hover:border-foreground/10 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <h3 className="font-semibold text-sm truncate">{app.club_name}</h3>
                            <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full flex-shrink-0">
                              {app.college_code}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground font-mono">
                            <span>🏫 {app.college_name}</span>
                            <span>✉️ {app.club_email}</span>
                            <span>📞 {app.contact}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-mono border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleApproval(app.id, app.user_id, false)}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> REJECT
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs font-mono bg-foreground text-background hover:bg-foreground/90"
                            onClick={() => handleApproval(app.id, app.user_id, true)}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> APPROVE
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Processed Applications */}
          {processedApps.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Processed Applications</h2>
              <div className="space-y-2">
                {processedApps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{app.club_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{app.college_name}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-3 py-1 rounded-full ${
                      app.status === "approved" 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {app.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
