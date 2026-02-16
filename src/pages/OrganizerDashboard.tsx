import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus, Users, Upload, Calendar, Award, CheckCircle, XCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Hackathon {
  id: string;
  name: string;
  theme: string;
  event_date: string | null;
  status: string;
  cash_prize: number | null;
}

interface Team {
  id: string;
  team_name: string;
  status: string;
  leader_id: string;
  hackathon_id: string;
}

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCertUpload, setShowCertUpload] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [certForm, setCertForm] = useState({ axon_id: "", certificate_type: "participation" });
  const [certFile, setCertFile] = useState<File | null>(null);

  const [hackForm, setHackForm] = useState({
    name: "", theme: "Technical", description: "", problem_statements: "",
    location: "", event_date: "", entry_fee: "0", cash_prize: "0",
    team_size_limit: "4", food_available: false, accommodation: false,
  });

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

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data: hacks } = await supabase
      .from("hackathons")
      .select("*")
      .eq("organizer_id", user.id)
      .order("created_at", { ascending: false });
    setHackathons(hacks || []);

    if (hacks && hacks.length > 0) {
      const hackIds = hacks.map(h => h.id);
      const { data: t } = await supabase.from("teams").select("*").in("hackathon_id", hackIds);
      setTeams(t || []);
    }
  };

  const handleCreateHackathon = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("hackathons").insert({
      ...hackForm,
      organizer_id: user.id,
      entry_fee: Number(hackForm.entry_fee),
      cash_prize: Number(hackForm.cash_prize),
      team_size_limit: Number(hackForm.team_size_limit),
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Created!", description: "Hackathon created successfully." });
      setShowCreateForm(false);
      fetchData();
    }
  };

  const handleTeamAction = async (teamId: string, approve: boolean) => {
    const { error } = await supabase.from("teams").update({ status: approve ? "accepted" : "rejected" }).eq("id", teamId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: approve ? "Accepted" : "Rejected" });
      fetchData();
    }
  };

  const handleCertUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile || !showCertUpload) return;
    setLoading(true);

    // Upload file
    const fileName = `${Date.now()}_${certFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(fileName, certFile);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("certificates").getPublicUrl(fileName);

    // Generate SHA256 hash
    const buffer = await certFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Find student by axon_id
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("axon_id", certForm.axon_id)
      .single();

    if (!studentProfile) {
      toast({ title: "Student not found", description: "No student with that Axon ID", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Insert certificate
    const { error: certError } = await supabase.from("certificates").insert({
      axon_id: certForm.axon_id,
      hackathon_id: showCertUpload,
      student_user_id: studentProfile.user_id,
      certificate_type: certForm.certificate_type,
      file_url: publicUrl,
      hash: hashHex,
      blockchain_tx: `0x${hashHex.substring(0, 40)}`, // Mock Polygon tx
      verified: true,
    });

    setLoading(false);
    if (certError) {
      toast({ title: "Error", description: certError.message, variant: "destructive" });
    } else {
      toast({ title: "Certificate issued!", description: `Hash: ${hashHex.substring(0, 16)}...` });
      setCertForm({ axon_id: "", certificate_type: "participation" });
      setCertFile(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
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
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Organizer Panel</h1>
              <p className="text-muted-foreground text-sm font-mono tracking-wider mt-1">
                {user?.user_metadata?.college_name || "College"} — {user?.user_metadata?.club_name || "Club"}
              </p>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="font-mono text-xs bg-foreground text-background hover:bg-foreground/90"
            >
              <Plus className="w-4 h-4 mr-2" /> CREATE HACKATHON
            </Button>
          </div>

          {/* Create Form Modal */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-10 p-6 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">New Hackathon</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}><X className="w-4 h-4" /></Button>
                </div>
                <form onSubmit={handleCreateHackathon} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-xs font-mono tracking-wider text-muted-foreground">HACKATHON NAME</Label>
                    <Input value={hackForm.name} onChange={e => setHackForm({...hackForm, name: e.target.value})} required className="mt-1 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-xs font-mono tracking-wider text-muted-foreground">THEME</Label>
                    <select
                      value={hackForm.theme}
                      onChange={e => setHackForm({...hackForm, theme: e.target.value})}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option>Technical</option>
                      <option>Non-Technical</option>
                      <option>Workshop</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-mono tracking-wider text-muted-foreground">DATE</Label>
                    <Input type="date" value={hackForm.event_date} onChange={e => setHackForm({...hackForm, event_date: e.target.value})} className="mt-1 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-xs font-mono tracking-wider text-muted-foreground">LOCATION</Label>
                    <Input value={hackForm.location} onChange={e => setHackForm({...hackForm, location: e.target.value})} className="mt-1 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-xs font-mono tracking-wider text-muted-foreground">CASH PRIZE (₹)</Label>
                    <Input type="number" value={hackForm.cash_prize} onChange={e => setHackForm({...hackForm, cash_prize: e.target.value})} className="mt-1 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-xs font-mono tracking-wider text-muted-foreground">ENTRY FEE (₹)</Label>
                    <Input type="number" value={hackForm.entry_fee} onChange={e => setHackForm({...hackForm, entry_fee: e.target.value})} className="mt-1 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-xs font-mono tracking-wider text-muted-foreground">TEAM SIZE LIMIT</Label>
                    <Input type="number" value={hackForm.team_size_limit} onChange={e => setHackForm({...hackForm, team_size_limit: e.target.value})} className="mt-1 bg-background border-border" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs font-mono tracking-wider text-muted-foreground">DESCRIPTION</Label>
                    <textarea value={hackForm.description} onChange={e => setHackForm({...hackForm, description: e.target.value})} rows={3} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none" />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={hackForm.food_available} onChange={e => setHackForm({...hackForm, food_available: e.target.checked})} className="rounded" />
                      Food Available
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={hackForm.accommodation} onChange={e => setHackForm({...hackForm, accommodation: e.target.checked})} className="rounded" />
                      Accommodation
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" className="w-full font-mono text-xs bg-foreground text-background hover:bg-foreground/90" disabled={loading}>
                      {loading ? "CREATING..." : "CREATE HACKATHON"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Events List */}
          <h2 className="text-xl font-semibold mb-4">Your Events</h2>
          {hackathons.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground font-mono">No events created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hackathons.map((h) => {
                const hackTeams = teams.filter(t => t.hackathon_id === h.id);
                return (
                  <div key={h.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{h.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{h.theme}</span>
                          {h.event_date && <span className="text-xs text-muted-foreground font-mono">{new Date(h.event_date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => setShowCertUpload(showCertUpload === h.id ? null : h.id)}>
                          <Upload className="w-3.5 h-3.5 mr-1" /> CERTIFICATE
                        </Button>
                      </div>
                    </div>

                    {/* Certificate Upload */}
                    <AnimatePresence>
                      {showCertUpload === h.id && (
                        <motion.form
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          onSubmit={handleCertUpload}
                          className="mb-4 p-4 rounded-lg bg-secondary/30 border border-border space-y-3 overflow-hidden"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">STUDENT AXON ID</Label>
                              <Input value={certForm.axon_id} onChange={e => setCertForm({...certForm, axon_id: e.target.value})} placeholder="AXN-XXXXXXXX" required className="mt-1 bg-background border-border font-mono text-xs" />
                            </div>
                            <div>
                              <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">TYPE</Label>
                              <select value={certForm.certificate_type} onChange={e => setCertForm({...certForm, certificate_type: e.target.value})} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                                <option value="participation">Participation</option>
                                <option value="winner">Winner</option>
                                <option value="runner-up">Runner Up</option>
                              </select>
                            </div>
                            <div>
                              <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">CERTIFICATE PDF</Label>
                              <Input type="file" accept=".pdf" onChange={e => setCertFile(e.target.files?.[0] || null)} required className="mt-1 bg-background border-border text-xs" />
                            </div>
                          </div>
                          <Button type="submit" size="sm" className="font-mono text-xs bg-foreground text-background hover:bg-foreground/90" disabled={loading}>
                            {loading ? "UPLOADING & HASHING..." : "ISSUE CERTIFICATE"}
                          </Button>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Teams */}
                    {hackTeams.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-mono text-muted-foreground tracking-wider">REGISTERED TEAMS ({hackTeams.length})</p>
                        {hackTeams.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                            <div className="flex items-center gap-3">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{t.team_name || "Unnamed Team"}</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                t.status === "accepted" ? "bg-success/10 text-success" :
                                t.status === "rejected" ? "bg-destructive/10 text-destructive" :
                                "bg-warning/10 text-warning"
                              }`}>{t.status.toUpperCase()}</span>
                            </div>
                            {t.status === "pending" && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleTeamAction(t.id, false)} className="text-destructive h-7 w-7 p-0">
                                  <XCircle className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleTeamAction(t.id, true)} className="text-success h-7 w-7 p-0">
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default OrganizerDashboard;
