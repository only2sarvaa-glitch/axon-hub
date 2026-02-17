import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut, Plus, Users, Upload, Calendar, Award, CheckCircle, XCircle, X,
  Send, MessageSquare, ChevronDown, ChevronRight, FileText, ExternalLink,
  Link as LinkIcon, StopCircle, Hexagon, Eye, Image
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/NotificationBell";
import { ShareEvent } from "@/components/ShareEvent";
import { EmojiPicker } from "@/components/EmojiPicker";
import { FileViewerButton } from "@/components/FileViewer";
import FloatingDots from "@/components/FloatingDots";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Hackathon {
  id: string;
  name: string;
  theme: string;
  event_date: string | null;
  status: string;
  cash_prize: number | null;
  description: string | null;
  problem_statements: string | null;
  location: string | null;
  entry_fee: number | null;
  team_size_limit: number | null;
  food_available: boolean | null;
  accommodation: boolean | null;
  brochure_url: string | null;
  poster_url: string | null;
  demo_ppt_url: string | null;
}

interface Team {
  id: string;
  team_name: string;
  status: string;
  leader_id: string;
  hackathon_id: string;
  ppt_url: string | null;
  accommodation: boolean | null;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
}

interface Profile {
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  axon_id: string | null;
  college: string | null;
}

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  hackathon_id: string;
  created_at: string;
  message_type: string;
  file_url: string | null;
}

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedHack, setExpandedHack] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  // Cert upload
  const [showCertUpload, setShowCertUpload] = useState<string | null>(null);
  const [certForm, setCertForm] = useState({ axon_id: "", certificate_type: "participation" });
  const [certFile, setCertFile] = useState<File | null>(null);

  // Chat
  const [chatHackathonId, setChatHackathonId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Create form
  const [hackForm, setHackForm] = useState({
    name: "", theme: "Technical", description: "", problem_statements: "",
    location: "", event_date: "", entry_fee: "0", cash_prize: "0",
    team_size_limit: "4", food_available: false, accommodation: false,
  });
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [demoPptFile, setDemoPptFile] = useState<File | null>(null);

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
    const { data: hacks } = await supabase.from("hackathons").select("*").eq("organizer_id", user.id).order("created_at", { ascending: false });
    setHackathons((hacks || []) as Hackathon[]);

    if (hacks && hacks.length > 0) {
      const hackIds = hacks.map((h: any) => h.id);
      const [teamsRes] = await Promise.all([
        supabase.from("teams").select("*").in("hackathon_id", hackIds),
      ]);
      const allTeams = (teamsRes.data || []) as Team[];
      setTeams(allTeams);
      
      const teamIds = allTeams.map(t => t.id);
      if (teamIds.length > 0) {
        const { data: members } = await supabase.from("team_members").select("*").in("team_id", teamIds);
        setTeamMembers((members || []) as TeamMember[]);
        
        const userIds = [...new Set([...allTeams.map(t => t.leader_id), ...(members || []).map((m: any) => m.user_id)])];
        if (userIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("*").in("user_id", userIds);
          setProfiles((profs || []) as Profile[]);
        }
      }
    }
  };

  const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);

  const uploadFile = async (file: File, bucket: string) => {
    const fileName = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) return "";
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  };

  const handleCreateHackathon = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!hackForm.name.trim() || !hackForm.description.trim() || !hackForm.location.trim() || !hackForm.event_date) {
      toast({ title: "Missing fields", description: "Name, description, location, and date are required.", variant: "destructive" });
      return;
    }

    setLoading(true);

    const [brochureUrl, posterUrl, demoPptUrl] = await Promise.all([
      brochureFile ? uploadFile(brochureFile, "brochures") : Promise.resolve(""),
      posterFile ? uploadFile(posterFile, "posters") : Promise.resolve(""),
      demoPptFile ? uploadFile(demoPptFile, "demo-ppts") : Promise.resolve(""),
    ]);

    const { error } = await supabase.from("hackathons").insert({
      ...hackForm,
      organizer_id: user.id,
      entry_fee: Number(hackForm.entry_fee),
      cash_prize: Number(hackForm.cash_prize),
      team_size_limit: Number(hackForm.team_size_limit),
      brochure_url: brochureUrl,
      poster_url: posterUrl,
      demo_ppt_url: demoPptUrl,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Created!", description: "Hackathon created successfully." });
      setShowCreateForm(false);
      setHackForm({ name: "", theme: "Technical", description: "", problem_statements: "", location: "", event_date: "", entry_fee: "0", cash_prize: "0", team_size_limit: "4", food_available: false, accommodation: false });
      setBrochureFile(null);
      setPosterFile(null);
      setDemoPptFile(null);
      fetchData();
    }
  };

  const handleTeamAction = async (teamId: string, approve: boolean) => {
    const team = teams.find(t => t.id === teamId);
    const { error } = await supabase.from("teams").update({ status: approve ? "accepted" : "rejected" }).eq("id", teamId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: approve ? "Team Accepted" : "Team Rejected" });
      // Notify team leader
      if (team) {
        await supabase.from("notifications").insert({
          user_id: team.leader_id,
          type: approve ? "team_accepted" : "team_rejected",
          title: approve ? "Team Accepted! 🎉" : "Team Rejected",
          message: `Your team "${team.team_name}" has been ${approve ? "accepted" : "rejected"}.`,
        });
      }
      fetchData();
    }
  };

  const handleCertUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile || !showCertUpload) return;
    setLoading(true);

    const fileName = `${Date.now()}_${certFile.name}`;
    const { error: uploadError } = await supabase.storage.from("certificates").upload(fileName, certFile);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("certificates").getPublicUrl(fileName);

    const buffer = await certFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: studentProfile } = await supabase.from("profiles").select("user_id").eq("axon_id", certForm.axon_id).single();
    if (!studentProfile) {
      toast({ title: "Student not found", description: "No student with that Axon ID", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Store hash on Polygon blockchain
    let blockchainTx = "";
    try {
      const { data: polygonData, error: polygonError } = await supabase.functions.invoke("polygon-certificate", {
        body: { action: "store", certificate_hash: hashHex },
      });
      if (polygonError) throw polygonError;
      blockchainTx = polygonData?.tx_hash || "";
      toast({ title: "⛓️ On-Chain", description: `Stored on Polygon: ${blockchainTx.substring(0, 16)}...` });
    } catch (err: any) {
      console.error("Polygon error:", err);
      toast({ title: "Blockchain Warning", description: "Hash stored locally. On-chain storage failed: " + (err?.message || "Unknown error"), variant: "destructive" });
    }

    const { error: certError } = await supabase.from("certificates").insert({
      axon_id: certForm.axon_id,
      hackathon_id: showCertUpload,
      student_user_id: studentProfile.user_id,
      certificate_type: certForm.certificate_type,
      file_url: publicUrl,
      hash: hashHex,
      blockchain_tx: blockchainTx,
      verified: true,
    });

    // Notify student
    await supabase.from("notifications").insert({
      user_id: studentProfile.user_id,
      type: "certificate",
      title: "New Certificate! 🏆",
      message: `You received a ${certForm.certificate_type} certificate.`,
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

  const handleEndHackathon = async (hackathonId: string) => {
    const { error } = await supabase.from("hackathons").update({ status: "ended" }).eq("id", hackathonId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Hackathon Ended", description: "Make sure all certificates have been issued." });
      fetchData();
    }
  };

  // Chat
  const openChat = async (hackathonId: string) => {
    setChatHackathonId(hackathonId);
    const { data } = await supabase.from("chat_messages").select("*").eq("hackathon_id", hackathonId).order("created_at", { ascending: true }).limit(200);
    setChatMessages((data || []) as ChatMessage[]);
    const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];
    if (senderIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, name").in("user_id", senderIds);
      const names: Record<string, string> = {};
      (profs || []).forEach((p: any) => { names[p.user_id] = p.name; });
      setSenderNames(names);
    }
  };

  useEffect(() => {
    if (!chatHackathonId) return;
    const channel = supabase.channel(`org-chat-${chatHackathonId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `hackathon_id=eq.${chatHackathonId}` },
        async (payload) => {
          const msg = payload.new as ChatMessage;
          setChatMessages(prev => [...prev, msg]);
          if (!senderNames[msg.sender_id]) {
            const { data } = await supabase.from("profiles").select("name").eq("user_id", msg.sender_id).single();
            if (data) setSenderNames(prev => ({ ...prev, [msg.sender_id]: data.name }));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatHackathonId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !chatHackathonId || !user) return;
    await supabase.from("chat_messages").insert({
      hackathon_id: chatHackathonId,
      sender_id: user.id,
      message: chatInput.trim(),
      message_type: "text",
    });
    setChatInput("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative">
      <FloatingDots />
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Hexagon className="w-4 h-4 text-foreground" strokeWidth={1.5} />
          <span className="font-mono text-lg font-bold tracking-[0.3em] text-foreground">AXON</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">{user?.user_metadata?.club_name || "Organizer"}</span>
          {user && <NotificationBell userId={user.id} />}
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Organizer Panel</h1>
              <p className="text-muted-foreground text-xs font-mono tracking-wider mt-1">
                {user?.user_metadata?.college_name || "College"} — {user?.user_metadata?.club_name || "Club"}
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="font-mono text-xs bg-foreground text-background hover:bg-foreground/90">
              <Plus className="w-4 h-4 mr-2" /> CREATE EVENT
            </Button>
          </div>

          {/* Chat Overlay */}
          <AnimatePresence>
            {chatHackathonId && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-8">
                <div className="w-full max-w-2xl flex flex-col h-[80vh]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{hackathons.find(h => h.id === chatHackathonId)?.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">GROUP CHAT — ORGANIZER VIEW</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setChatHackathonId(null)}><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-3 mb-3">
                    {chatMessages.length === 0 && <p className="text-xs text-muted-foreground font-mono text-center py-8">No messages yet</p>}
                    {chatMessages.map(msg => (
                      <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? "items-end" : "items-start"}`}>
                        <span className="text-[10px] font-mono text-muted-foreground mb-0.5">
                          {msg.sender_id === user?.id ? "You (Organizer)" : senderNames[msg.sender_id] || "Unknown"}
                        </span>
                        <div className={`px-3 py-2 rounded-xl max-w-[75%] text-sm ${msg.sender_id === user?.id ? "bg-foreground text-background" : "bg-secondary text-foreground"}`}>
                          {msg.message}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2 items-center">
                    <EmojiPicker onSelect={emoji => setChatInput(prev => prev + emoji)} />
                    <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Send update to group..." className="bg-card border-border flex-1" />
                    <Button onClick={sendMessage} size="sm" className="bg-foreground text-background hover:bg-foreground/90"><Send className="w-4 h-4" /></Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Create Form */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-8 p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">New Event</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}><X className="w-4 h-4" /></Button>
                </div>
                <form onSubmit={handleCreateHackathon} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">EVENT NAME *</Label>
                    <Input value={hackForm.name} onChange={e => setHackForm({...hackForm, name: e.target.value})} required className="mt-1 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">THEME</Label>
                    <select value={hackForm.theme} onChange={e => setHackForm({...hackForm, theme: e.target.value})} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                      <option>Technical</option>
                      <option>Non-Technical</option>
                      <option>Workshop</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">DATE *</Label>
                    <Input type="date" value={hackForm.event_date} onChange={e => setHackForm({...hackForm, event_date: e.target.value})} required className="mt-1 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">LOCATION *</Label>
                    <Input value={hackForm.location} onChange={e => setHackForm({...hackForm, location: e.target.value})} required className="mt-1 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">CASH PRIZE (₹)</Label>
                    <Input type="number" value={hackForm.cash_prize} onChange={e => setHackForm({...hackForm, cash_prize: e.target.value})} className="mt-1 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">ENTRY FEE (₹)</Label>
                    <Input type="number" value={hackForm.entry_fee} onChange={e => setHackForm({...hackForm, entry_fee: e.target.value})} className="mt-1 bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">TEAM SIZE LIMIT</Label>
                    <Input type="number" value={hackForm.team_size_limit} onChange={e => setHackForm({...hackForm, team_size_limit: e.target.value})} className="mt-1 bg-background border-border" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">DESCRIPTION *</Label>
                    <textarea value={hackForm.description} onChange={e => setHackForm({...hackForm, description: e.target.value})} rows={3} required className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">PROBLEM STATEMENTS</Label>
                    <textarea value={hackForm.problem_statements} onChange={e => setHackForm({...hackForm, problem_statements: e.target.value})} rows={3} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none" placeholder="One per line..." />
                  </div>

                  {/* Media uploads */}
                  <div>
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground flex items-center gap-1"><Image className="w-3 h-3" /> EVENT POSTER (IMAGE)</Label>
                    <Input type="file" accept="image/*" onChange={e => setPosterFile(e.target.files?.[0] || null)} className="mt-1 bg-background border-border text-xs" />
                    {posterFile && <p className="text-[10px] text-success mt-1 font-mono">{posterFile.name}</p>}
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">DEMO PPT (FOR STUDENTS)</Label>
                    <Input type="file" accept=".ppt,.pptx,.pdf" onChange={e => setDemoPptFile(e.target.files?.[0] || null)} className="mt-1 bg-background border-border text-xs" />
                    {demoPptFile && <p className="text-[10px] text-success mt-1 font-mono">{demoPptFile.name}</p>}
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">BROCHURE PDF (OPTIONAL)</Label>
                    <Input type="file" accept=".pdf" onChange={e => setBrochureFile(e.target.files?.[0] || null)} className="mt-1 bg-background border-border text-xs" />
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={hackForm.food_available} onChange={e => setHackForm({...hackForm, food_available: e.target.checked})} className="rounded" />
                      Food
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={hackForm.accommodation} onChange={e => setHackForm({...hackForm, accommodation: e.target.checked})} className="rounded" />
                      Accommodation
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" className="w-full font-mono text-xs bg-foreground text-background hover:bg-foreground/90" disabled={loading}>
                      {loading ? "CREATING..." : "CREATE EVENT"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Events */}
          <h2 className="text-lg font-semibold mb-4">Your Events</h2>
          {hackathons.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground font-mono">No events yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hackathons.map((h) => {
                const hackTeams = teams.filter(t => t.hackathon_id === h.id);
                const isExpanded = expandedHack === h.id;
                return (
                  <div key={h.id} className="rounded-xl border border-border bg-card">
                    <button onClick={() => setExpandedHack(isExpanded ? null : h.id)} className="w-full flex items-center justify-between p-5 text-left">
                      <div className="flex items-center gap-4">
                        {h.poster_url && (
                          <img src={h.poster_url} alt={h.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{h.name}</h3>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${h.status === "ended" ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"}`}>
                              {h.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{h.theme}</span>
                            {h.event_date && <span className="text-xs text-muted-foreground font-mono">{new Date(h.event_date).toLocaleDateString()}</span>}
                            <span className="text-xs text-muted-foreground font-mono">{hackTeams.length} teams</span>
                          </div>
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-5 pb-5 space-y-4">
                            {/* Poster preview */}
                            {h.poster_url && (
                              <div className="rounded-lg overflow-hidden border border-border">
                                <img src={h.poster_url} alt={h.name} className="w-full max-h-64 object-cover" />
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" className="font-mono text-[10px]" onClick={() => openChat(h.id)}>
                                <MessageSquare className="w-3 h-3 mr-1" /> GROUP CHAT
                              </Button>
                              <Button variant="outline" size="sm" className="font-mono text-[10px]" onClick={() => setShowCertUpload(showCertUpload === h.id ? null : h.id)}>
                                <Upload className="w-3 h-3 mr-1" /> ISSUE CERT
                              </Button>
                              <ShareEvent hackathonName={h.name} hackathonId={h.id} />
                              {h.demo_ppt_url && (
                                <FileViewerButton url={h.demo_ppt_url} title={`${h.name} - Demo PPT`}>
                                  <Button variant="outline" size="sm" className="font-mono text-[10px]">
                                    <FileText className="w-3 h-3 mr-1" /> DEMO PPT
                                  </Button>
                                </FileViewerButton>
                              )}
                              {h.brochure_url && (
                                <FileViewerButton url={h.brochure_url} title={`${h.name} - Brochure`}>
                                  <Button variant="outline" size="sm" className="font-mono text-[10px]">
                                    <FileText className="w-3 h-3 mr-1" /> BROCHURE
                                  </Button>
                                </FileViewerButton>
                              )}
                              {h.status === "active" && (
                                <Button variant="outline" size="sm" className="font-mono text-[10px] text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleEndHackathon(h.id)}>
                                  <StopCircle className="w-3 h-3 mr-1" /> END EVENT
                                </Button>
                              )}
                            </div>

                            {/* Cert Upload */}
                            <AnimatePresence>
                              {showCertUpload === h.id && (
                                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={handleCertUpload} className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3 overflow-hidden">
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
                                    {loading ? "UPLOADING..." : "ISSUE CERTIFICATE"}
                                  </Button>
                                </motion.form>
                              )}
                            </AnimatePresence>

                            {/* Teams */}
                            {hackTeams.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">REGISTERED TEAMS ({hackTeams.length})</p>
                                {hackTeams.map(t => {
                                  const isTeamExpanded = expandedTeam === t.id;
                                  const leader = getProfile(t.leader_id);
                                  const members = teamMembers.filter(m => m.team_id === t.id);
                                  return (
                                    <div key={t.id} className="rounded-lg border border-border bg-secondary/20">
                                      <button onClick={() => setExpandedTeam(isTeamExpanded ? null : t.id)} className="w-full flex items-center justify-between p-3 text-left">
                                        <div className="flex items-center gap-3">
                                          <Users className="w-4 h-4 text-muted-foreground" />
                                          <span className="text-sm font-medium">{t.team_name || "Unnamed"}</span>
                                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                            t.status === "accepted" ? "bg-success/10 text-success" :
                                            t.status === "rejected" ? "bg-destructive/10 text-destructive" :
                                            "bg-secondary text-muted-foreground"
                                          }`}>{t.status.toUpperCase()}</span>
                                          <span className="text-[10px] text-muted-foreground">{members.length} members</span>
                                          {t.accommodation && <span className="text-[10px] text-muted-foreground">🏨</span>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {t.status === "pending" && (
                                            <>
                                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleTeamAction(t.id, false); }} className="text-destructive h-7 w-7 p-0">
                                                <XCircle className="w-4 h-4" />
                                              </Button>
                                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleTeamAction(t.id, true); }} className="text-success h-7 w-7 p-0">
                                                <CheckCircle className="w-4 h-4" />
                                              </Button>
                                            </>
                                          )}
                                          {isTeamExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" /> : <ChevronRight className="w-3 h-3 text-muted-foreground ml-1" />}
                                        </div>
                                      </button>

                                      <AnimatePresence>
                                        {isTeamExpanded && (
                                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <div className="px-3 pb-3 space-y-2">
                                              <div className="p-2 rounded bg-background/50">
                                                <p className="text-[10px] font-mono text-muted-foreground mb-1">TEAM LEADER</p>
                                                {leader && (
                                                  <div className="text-xs space-y-0.5">
                                                    <p className="font-medium">{leader.name}</p>
                                                    <p className="text-muted-foreground font-mono">{leader.axon_id}</p>
                                                    <p className="text-muted-foreground">{leader.email} • {leader.phone}</p>
                                                    {leader.college && <p className="text-muted-foreground">{leader.college}</p>}
                                                  </div>
                                                )}
                                              </div>
                                              {members.filter(m => m.user_id !== t.leader_id).map(m => {
                                                const mp = getProfile(m.user_id);
                                                return mp ? (
                                                  <div key={m.id} className="p-2 rounded bg-background/50 text-xs space-y-0.5">
                                                    <p className="font-medium">{mp.name}</p>
                                                    <p className="text-muted-foreground font-mono">{mp.axon_id}</p>
                                                    <p className="text-muted-foreground">{mp.email} • {mp.phone}</p>
                                                  </div>
                                                ) : null;
                                              })}
                                              {t.ppt_url && (
                                                <FileViewerButton url={t.ppt_url} title={`${t.team_name} - PPT`} className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground">
                                                  <FileText className="w-3 h-3" /> VIEW PPT
                                                </FileViewerButton>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {hackTeams.length === 0 && (
                              <p className="text-xs text-muted-foreground font-mono">No teams registered yet</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
