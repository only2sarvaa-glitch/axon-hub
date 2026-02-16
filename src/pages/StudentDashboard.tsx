import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Search, Calendar, Award, MessageSquare, Users, Copy, ExternalLink, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  axon_id: string | null;
  name: string;
  college: string | null;
  email: string | null;
}

interface Hackathon {
  id: string;
  name: string;
  theme: string;
  event_date: string | null;
  cash_prize: number | null;
  location: string | null;
  status: string;
}

interface Certificate {
  id: string;
  certificate_type: string;
  axon_id: string;
  file_url: string | null;
  verified: boolean | null;
  hackathon_id: string;
  created_at: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState("hackathons");
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [friendResult, setFriendResult] = useState<Profile | null>(null);
  const [friendSearching, setFriendSearching] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) { navigate("/auth/student"); return; }
      setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth/student");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [profileRes, hackRes, certRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("hackathons").select("*").eq("status", "active").order("event_date", { ascending: true }),
      supabase.from("certificates").select("*").eq("student_user_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (profileRes.data) setProfile(profileRes.data);
    setHackathons(hackRes.data || []);
    setCertificates(certRes.data || []);
  };

  const handleSearchFriend = async () => {
    if (!friendSearch.trim()) return;
    setFriendSearching(true);
    setFriendResult(null);
    const { data } = await supabase
      .from("profiles")
      .select("axon_id, name, college, email")
      .ilike("axon_id", `%${friendSearch.trim()}%`)
      .limit(1)
      .single();
    setFriendResult(data);
    setFriendSearching(false);
  };

  const copyAxonId = () => {
    if (profile?.axon_id) {
      navigator.clipboard.writeText(profile.axon_id);
      toast({ title: "Copied!", description: "Axon ID copied to clipboard" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const filteredHackathons = hackathons.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { key: "hackathons", icon: Calendar, label: "Hackathons" },
    { key: "certificates", icon: Award, label: "Certificates" },
    { key: "friends", icon: Users, label: "Find Friends" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <span className="font-mono text-lg font-bold tracking-[0.3em] text-foreground">AXON</span>
        <div className="flex items-center gap-3">
          {profile?.axon_id && (
            <button
              onClick={copyAxonId}
              className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary px-3 py-1.5 rounded-full hover:text-foreground transition-colors"
            >
              {profile.axon_id}
              <Copy className="w-3 h-3" />
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-1 tracking-tight">
            Welcome, {profile?.name || user?.user_metadata?.name || "Student"}
          </h1>
          <p className="text-muted-foreground text-sm mb-10 font-mono tracking-wider">
            {profile?.college || ""} {profile?.axon_id ? `• ${profile.axon_id}` : ""}
          </p>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-secondary/50 p-1 rounded-xl w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono tracking-wider transition-all ${
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label.toUpperCase()}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Hackathons Tab */}
            {activeTab === "hackathons" && (
              <motion.div key="hackathons" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Input
                  placeholder="Search hackathons by name, theme, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-card border-border max-w-md mb-6"
                />
                {filteredHackathons.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground font-mono">No hackathons available yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredHackathons.map((h) => (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-5 rounded-xl bg-card border border-border hover:border-foreground/10 transition-all group"
                      >
                        <div>
                          <p className="font-semibold">{h.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{h.theme}</span>
                            {h.event_date && <span className="text-xs text-muted-foreground font-mono">{new Date(h.event_date).toLocaleDateString()}</span>}
                            {h.location && <span className="text-xs text-muted-foreground">📍 {h.location}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {h.cash_prize && h.cash_prize > 0 && (
                            <span className="text-xs font-mono text-success">₹{h.cash_prize.toLocaleString()}</span>
                          )}
                          <Button variant="outline" size="sm" className="font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            VIEW
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Certificates Tab */}
            {activeTab === "certificates" && (
              <motion.div key="certificates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {certificates.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Award className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground font-mono">No certificates yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Participate in hackathons to earn certificates</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex items-center justify-between p-5 rounded-xl bg-card border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <Award className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium capitalize">{cert.certificate_type} Certificate</p>
                            <p className="text-xs text-muted-foreground font-mono">{new Date(cert.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {cert.verified && (
                            <span className="text-[10px] font-mono text-success bg-success/10 px-2 py-0.5 rounded-full">VERIFIED</span>
                          )}
                          {cert.file_url && (
                            <a href={cert.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6">
                  <Button variant="outline" className="font-mono text-xs" onClick={() => navigate("/verify")}>
                    VERIFY A CERTIFICATE
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Friends Tab */}
            {activeTab === "friends" && (
              <motion.div key="friends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex gap-3 mb-6">
                  <Input
                    placeholder="Enter Axon ID (e.g. AXN-A1B2C3D4)"
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchFriend()}
                    className="bg-card border-border max-w-md font-mono"
                  />
                  <Button variant="outline" onClick={handleSearchFriend} disabled={friendSearching} className="font-mono text-xs">
                    <Search className="w-4 h-4 mr-2" />
                    {friendSearching ? "SEARCHING..." : "SEARCH"}
                  </Button>
                </div>

                {friendResult === null && friendSearch && !friendSearching && (
                  <div className="rounded-xl border border-border bg-card p-8 text-center">
                    <p className="text-sm text-muted-foreground font-mono">No user found with that Axon ID</p>
                  </div>
                )}

                {friendResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl border border-border bg-card p-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{friendResult.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{friendResult.axon_id}</p>
                        {friendResult.college && <p className="text-xs text-muted-foreground mt-0.5">{friendResult.college}</p>}
                      </div>
                    </div>
                  </motion.div>
                )}

                {!friendSearch && (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground font-mono">Search by Axon ID to find friends</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
};

export default StudentDashboard;
