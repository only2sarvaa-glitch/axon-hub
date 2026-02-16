import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut, Search, Calendar, Award, MessageSquare, Users, Copy, ExternalLink,
  User, Plus, Upload, X, Send, FileText, ChevronRight, MapPin, Trophy,
  Check, Hexagon, Heart, Globe, Image
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/NotificationBell";
import { EmojiPicker } from "@/components/EmojiPicker";

interface Profile {
  axon_id: string | null;
  name: string;
  college: string | null;
  email: string | null;
  phone: string | null;
  user_id: string;
  avatar_url: string | null;
}

interface Hackathon {
  id: string;
  name: string;
  theme: string;
  event_date: string | null;
  cash_prize: number | null;
  location: string | null;
  status: string;
  description: string | null;
  problem_statements: string | null;
  entry_fee: number | null;
  team_size_limit: number | null;
  food_available: boolean | null;
  accommodation: boolean | null;
  brochure_url: string | null;
  poster_url: string | null;
  demo_ppt_url: string | null;
}

interface Certificate {
  id: string;
  certificate_type: string;
  axon_id: string;
  file_url: string | null;
  verified: boolean | null;
  hackathon_id: string;
  created_at: string;
  hash: string | null;
  blockchain_tx: string | null;
}

interface Team {
  id: string;
  team_name: string;
  status: string;
  hackathon_id: string;
  leader_id: string;
  ppt_url: string | null;
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

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState("hackathons");
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [friendResults, setFriendResults] = useState<Profile[]>([]);
  const [friendSearching, setFriendSearching] = useState(false);

  // Registration
  const [selectedHackathon, setSelectedHackathon] = useState<Hackathon | null>(null);
  const [showRegForm, setShowRegForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teammateAxonIds, setTeammateAxonIds] = useState<string[]>([""]);
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [wantAccommodation, setWantAccommodation] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Chat
  const [chatHackathonId, setChatHackathonId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      supabase.from("hackathons").select("*").order("event_date", { ascending: true }),
      supabase.from("certificates").select("*").eq("student_user_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (profileRes.data) setProfile(profileRes.data as Profile);
    setHackathons((hackRes.data || []) as Hackathon[]);
    setCertificates((certRes.data || []) as Certificate[]);

    const { data: memberTeams } = await supabase.from("team_members").select("team_id").eq("user_id", user.id);
    const { data: leaderTeams } = await supabase.from("teams").select("*").eq("leader_id", user.id);
    
    const memberTeamIds = (memberTeams || []).map(m => m.team_id);
    let allTeams = leaderTeams || [];
    if (memberTeamIds.length > 0) {
      const { data: mTeams } = await supabase.from("teams").select("*").in("id", memberTeamIds);
      if (mTeams) allTeams = [...allTeams, ...mTeams.filter(t => !allTeams.find(a => a.id === t.id))];
    }
    setMyTeams(allTeams as Team[]);
  };

  const handleSearchFriend = async () => {
    if (!friendSearch.trim()) return;
    setFriendSearching(true);
    setFriendResults([]);
    const { data } = await supabase
      .from("profiles")
      .select("axon_id, name, college, email, phone, user_id, avatar_url")
      .or(`axon_id.ilike.%${friendSearch.trim()}%,name.ilike.%${friendSearch.trim()}%,college.ilike.%${friendSearch.trim()}%`)
      .neq("user_id", user?.id)
      .limit(10);
    setFriendResults((data || []) as Profile[]);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHackathon || !user) return;
    setRegLoading(true);

    try {
      let pptUrl = "";
      if (pptFile) {
        const fileName = `${Date.now()}_${pptFile.name}`;
        const { error: upErr } = await supabase.storage.from("ppts").upload(fileName, pptFile);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("ppts").getPublicUrl(fileName);
        pptUrl = publicUrl;
      }

      const { data: team, error: teamErr } = await supabase.from("teams").insert({
        team_name: teamName,
        hackathon_id: selectedHackathon.id,
        leader_id: user.id,
        accommodation: wantAccommodation,
        ppt_url: pptUrl,
      }).select().single();
      if (teamErr) throw teamErr;

      await supabase.from("team_members").insert({ team_id: team.id, user_id: user.id });

      for (const axonId of teammateAxonIds.filter(a => a.trim())) {
        const { data: mate } = await supabase.from("profiles").select("user_id").eq("axon_id", axonId.trim()).single();
        if (mate) {
          await supabase.from("team_members").insert({ team_id: team.id, user_id: mate.user_id });
        }
      }

      // Notify organizer
      const hack = hackathons.find(h => h.id === selectedHackathon.id);
      if (hack) {
        await supabase.from("notifications").insert({
          user_id: (hack as any).organizer_id,
          type: "registration",
          title: "New Registration 📋",
          message: `Team "${teamName}" registered for ${selectedHackathon.name}`,
        });
      }

      toast({ title: "Registered!", description: `Team "${teamName}" registered for ${selectedHackathon.name}` });
      setShowRegForm(false);
      setSelectedHackathon(null);
      setTeamName("");
      setTeammateAxonIds([""]);
      setPptFile(null);
      setWantAccommodation(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setRegLoading(false);
  };

  // Chat
  const openChat = async (hackathonId: string) => {
    setChatHackathonId(hackathonId);
    setActiveTab("chat");
    const { data } = await supabase.from("chat_messages").select("*").eq("hackathon_id", hackathonId).order("created_at", { ascending: true }).limit(200);
    setChatMessages((data || []) as ChatMessage[]);
    const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", senderIds);
      const names: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { names[p.user_id] = p.name; });
      setSenderNames(names);
    }
  };

  useEffect(() => {
    if (!chatHackathonId) return;
    const channel = supabase.channel(`chat-${chatHackathonId}`)
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

  const filteredHackathons = hackathons.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getHackathonName = (id: string) => hackathons.find(h => h.id === id)?.name || "Unknown";

  const myRegisteredHackathonIds = myTeams.map(t => t.hackathon_id);
  const myAcceptedTeams = myTeams.filter(t => t.status === "accepted");

  const tabs = [
    { key: "hackathons", icon: Calendar, label: "Events" },
    { key: "myevents", icon: Users, label: "My Teams" },
    { key: "chat", icon: MessageSquare, label: "Chat" },
    { key: "certificates", icon: Award, label: "Certs" },
    { key: "friends", icon: Search, label: "Find" },
    { key: "social", icon: Globe, label: "Social" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Hexagon className="w-4 h-4 text-foreground" strokeWidth={1.5} />
          <span className="font-mono text-lg font-bold tracking-[0.3em] text-foreground">AXON</span>
        </div>
        <div className="flex items-center gap-3">
          {profile?.axon_id && (
            <button onClick={copyAxonId} className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary px-3 py-1.5 rounded-full hover:text-foreground transition-colors">
              {profile.axon_id}
              <Copy className="w-3 h-3" />
            </button>
          )}
          {user && <NotificationBell userId={user.id} />}
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="p-0 w-8 h-8 rounded-full overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1 tracking-tight">
            {profile?.name || "Student"}
          </h1>
          <p className="text-muted-foreground text-xs mb-8 font-mono tracking-wider">
            {profile?.college || ""} {profile?.axon_id ? `• ${profile.axon_id}` : ""}
          </p>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-secondary/50 p-1 rounded-xl overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === "social") {
                    navigate("/community");
                    return;
                  }
                  setActiveTab(tab.key);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-mono tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label.toUpperCase()}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Hackathons Tab */}
            {activeTab === "hackathons" && (
              <motion.div key="hackathons" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Input placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-card border-border max-w-md mb-6" />
                
                {/* Hackathon Detail View */}
                {selectedHackathon && !showRegForm && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 rounded-xl border border-border bg-card overflow-hidden">
                    {/* Poster */}
                    {selectedHackathon.poster_url && (
                      <img src={selectedHackathon.poster_url} alt={selectedHackathon.name} className="w-full max-h-72 object-cover" />
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{selectedHackathon.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{selectedHackathon.theme}</span>
                            {selectedHackathon.event_date && <span className="text-xs text-muted-foreground font-mono">{new Date(selectedHackathon.event_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedHackathon(null)}><X className="w-4 h-4" /></Button>
                      </div>
                      
                      {selectedHackathon.description && <p className="text-sm text-muted-foreground mb-4">{selectedHackathon.description}</p>}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {selectedHackathon.location && (
                          <div className="text-xs"><span className="font-mono text-muted-foreground block">LOCATION</span><span className="flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{selectedHackathon.location}</span></div>
                        )}
                        {selectedHackathon.cash_prize && selectedHackathon.cash_prize > 0 && (
                          <div className="text-xs"><span className="font-mono text-muted-foreground block">PRIZE</span><span className="text-success mt-0.5 block">₹{selectedHackathon.cash_prize.toLocaleString()}</span></div>
                        )}
                        <div className="text-xs"><span className="font-mono text-muted-foreground block">ENTRY FEE</span><span className="mt-0.5 block">₹{selectedHackathon.entry_fee || 0}</span></div>
                        <div className="text-xs"><span className="font-mono text-muted-foreground block">TEAM SIZE</span><span className="mt-0.5 block">Max {selectedHackathon.team_size_limit || 4}</span></div>
                      </div>

                      <div className="flex gap-2 text-[10px] font-mono text-muted-foreground mb-4">
                        {selectedHackathon.food_available && <span className="bg-secondary px-2 py-0.5 rounded-full">🍽 FOOD</span>}
                        {selectedHackathon.accommodation && <span className="bg-secondary px-2 py-0.5 rounded-full">🏨 STAY</span>}
                      </div>

                      {selectedHackathon.problem_statements && (
                        <div className="mb-4">
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">PROBLEM STATEMENTS</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedHackathon.problem_statements}</p>
                        </div>
                      )}

                      {/* Resources */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedHackathon.brochure_url && (
                          <a href={selectedHackathon.brochure_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="font-mono text-[10px]">
                              <FileText className="w-3 h-3 mr-1" /> BROCHURE
                            </Button>
                          </a>
                        )}
                        {selectedHackathon.demo_ppt_url && (
                          <a href={selectedHackathon.demo_ppt_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="font-mono text-[10px]">
                              <FileText className="w-3 h-3 mr-1" /> DEMO PPT
                            </Button>
                          </a>
                        )}
                      </div>

                      {selectedHackathon.status === "active" && !myRegisteredHackathonIds.includes(selectedHackathon.id) ? (
                        <Button onClick={() => setShowRegForm(true)} className="font-mono text-xs bg-foreground text-background hover:bg-foreground/90 w-full">
                          <Plus className="w-3.5 h-3.5 mr-1" /> REGISTER TEAM
                        </Button>
                      ) : myRegisteredHackathonIds.includes(selectedHackathon.id) ? (
                        <div className="flex items-center gap-2 text-xs font-mono text-success"><Check className="w-3.5 h-3.5" /> ALREADY REGISTERED</div>
                      ) : (
                        <div className="text-xs font-mono text-muted-foreground">Event is {selectedHackathon.status}</div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Registration Form */}
                {showRegForm && selectedHackathon && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-xl border border-border bg-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Register for {selectedHackathon.name}</h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowRegForm(false)}><X className="w-4 h-4" /></Button>
                    </div>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">TEAM NAME</Label>
                        <Input value={teamName} onChange={e => setTeamName(e.target.value)} required className="mt-1 bg-background border-border" placeholder="Your team name" />
                      </div>
                      <div>
                        <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">TEAMMATES (AXON IDS)</Label>
                        <p className="text-[10px] text-muted-foreground mb-2">Your Axon ID is auto-added as team leader</p>
                        {teammateAxonIds.map((axon, i) => (
                          <div key={i} className="flex gap-2 mb-2">
                            <Input value={axon} onChange={e => { const updated = [...teammateAxonIds]; updated[i] = e.target.value; setTeammateAxonIds(updated); }} placeholder="AXN-XXXXXXXX" className="bg-background border-border font-mono text-xs" />
                            {teammateAxonIds.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => setTeammateAxonIds(teammateAxonIds.filter((_, j) => j !== i))}><X className="w-3 h-3" /></Button>
                            )}
                          </div>
                        ))}
                        {teammateAxonIds.length < (selectedHackathon.team_size_limit || 4) - 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setTeammateAxonIds([...teammateAxonIds, ""])} className="text-xs font-mono">
                            <Plus className="w-3 h-3 mr-1" /> ADD TEAMMATE
                          </Button>
                        )}
                      </div>
                      <div>
                        <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">UPLOAD PPT (OPTIONAL)</Label>
                        <Input type="file" accept=".ppt,.pptx,.pdf" onChange={e => setPptFile(e.target.files?.[0] || null)} className="mt-1 bg-background border-border text-xs" />
                      </div>
                      {selectedHackathon.accommodation && (
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={wantAccommodation} onChange={e => setWantAccommodation(e.target.checked)} className="rounded" />
                          Need Accommodation
                        </label>
                      )}
                      <Button type="submit" className="w-full font-mono text-xs bg-foreground text-background hover:bg-foreground/90" disabled={regLoading}>
                        {regLoading ? "REGISTERING..." : "SUBMIT REGISTRATION"}
                      </Button>
                    </form>
                  </motion.div>
                )}

                {/* Event List */}
                {!selectedHackathon && (
                  filteredHackathons.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-12 text-center">
                      <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                      <p className="text-sm text-muted-foreground font-mono">No events available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredHackathons.map((h) => (
                        <motion.button
                          key={h.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => setSelectedHackathon(h)}
                          className="w-full flex items-center justify-between p-5 rounded-xl bg-card border border-border hover:border-foreground/10 transition-all group text-left"
                        >
                          <div className="flex items-center gap-4">
                            {h.poster_url && (
                              <img src={h.poster_url} alt={h.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
                            )}
                            <div>
                              <p className="font-semibold">{h.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{h.theme}</span>
                                {h.event_date && <span className="text-xs text-muted-foreground font-mono">{new Date(h.event_date).toLocaleDateString()}</span>}
                                {h.location && <span className="text-xs text-muted-foreground">📍 {h.location}</span>}
                                {myRegisteredHackathonIds.includes(h.id) && <span className="text-[10px] font-mono text-success bg-success/10 px-2 py-0.5 rounded-full">REGISTERED</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {h.cash_prize && h.cash_prize > 0 && (
                              <span className="text-xs font-mono text-success">₹{h.cash_prize.toLocaleString()}</span>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )
                )}
              </motion.div>
            )}

            {/* My Teams Tab */}
            {activeTab === "myevents" && (
              <motion.div key="myevents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {myTeams.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground font-mono">No team registrations yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myTeams.map(t => (
                      <div key={t.id} className="p-5 rounded-xl bg-card border border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{t.team_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{getHackathonName(t.hackathon_id)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                              t.status === "accepted" ? "bg-success/10 text-success" :
                              t.status === "rejected" ? "bg-destructive/10 text-destructive" :
                              "bg-secondary text-muted-foreground"
                            }`}>{t.status.toUpperCase()}</span>
                            {t.status === "accepted" && (
                              <Button variant="ghost" size="sm" onClick={() => openChat(t.hackathon_id)} className="text-xs font-mono">
                                <MessageSquare className="w-3.5 h-3.5 mr-1" /> CHAT
                              </Button>
                            )}
                          </div>
                        </div>
                        {t.ppt_url && (
                          <a href={t.ppt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground mt-2">
                            <FileText className="w-3 h-3" /> PPT
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {!chatHackathonId ? (
                  <div>
                    <p className="text-xs font-mono text-muted-foreground mb-4 tracking-wider">SELECT AN EVENT TO CHAT</p>
                    {myAcceptedTeams.length === 0 ? (
                      <div className="rounded-xl border border-border bg-card p-12 text-center">
                        <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                        <p className="text-sm text-muted-foreground font-mono">No accepted teams yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Chat is available after your team is accepted</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {myAcceptedTeams.map(t => (
                          <button key={t.id} onClick={() => openChat(t.hackathon_id)} className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-foreground/10 transition-all">
                            <div className="text-left">
                              <p className="font-medium text-sm">{getHackathonName(t.hackathon_id)}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{t.team_name}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* DM shortcut */}
                    <div className="mt-6">
                      <Button variant="outline" className="font-mono text-xs" onClick={() => navigate("/messages")}>
                        <MessageSquare className="w-3.5 h-3.5 mr-1" /> PRIVATE MESSAGES
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-[60vh]">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-sm">{getHackathonName(chatHackathonId)}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">GROUP CHAT</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setChatHackathonId(null)}><X className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-3 mb-3">
                      {chatMessages.length === 0 && (
                        <p className="text-xs text-muted-foreground font-mono text-center py-8">No messages yet. Say hello!</p>
                      )}
                      {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? "items-end" : "items-start"}`}>
                          <span className="text-[10px] font-mono text-muted-foreground mb-0.5">
                            {msg.sender_id === user?.id ? "You" : senderNames[msg.sender_id] || "Unknown"}
                          </span>
                          <div className={`px-3 py-2 rounded-xl max-w-[75%] text-sm ${
                            msg.sender_id === user?.id ? "bg-foreground text-background" : "bg-secondary text-foreground"
                          }`}>
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
                      <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Type a message..." className="bg-card border-border flex-1" />
                      <Button onClick={sendMessage} size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
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
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-5 rounded-xl bg-card border border-border">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cert.certificate_type === "winner" ? "bg-warning/10" : "bg-secondary"}`}>
                            {cert.certificate_type === "winner" ? <Trophy className="w-4 h-4 text-warning" /> : <Award className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium capitalize">{cert.certificate_type} — {getHackathonName(cert.hackathon_id)}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{new Date(cert.created_at).toLocaleDateString()} • {cert.hash?.substring(0, 16)}...</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {cert.verified && <span className="text-[10px] font-mono text-success bg-success/10 px-2 py-0.5 rounded-full">VERIFIED</span>}
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
                  <Button variant="outline" className="font-mono text-xs" onClick={() => navigate("/verify")}>VERIFY A CERTIFICATE</Button>
                </div>
              </motion.div>
            )}

            {/* Friends / Search Tab */}
            {activeTab === "friends" && (
              <motion.div key="friends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex gap-3 mb-6">
                  <Input
                    placeholder="Search by name, Axon ID, or college..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchFriend()}
                    className="bg-card border-border max-w-md font-mono"
                  />
                  <Button variant="outline" onClick={handleSearchFriend} disabled={friendSearching} className="font-mono text-xs">
                    <Search className="w-4 h-4 mr-2" />
                    {friendSearching ? "..." : "SEARCH"}
                  </Button>
                </div>

                {friendResults.length === 0 && friendSearch && !friendSearching && (
                  <div className="rounded-xl border border-border bg-card p-8 text-center">
                    <p className="text-sm text-muted-foreground font-mono">No users found</p>
                  </div>
                )}

                {friendResults.length > 0 && (
                  <div className="space-y-3">
                    {friendResults.map(r => (
                      <motion.div key={r.user_id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between">
                          <button onClick={() => navigate(`/profile?id=${r.user_id}`)} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden">
                              {r.avatar_url ? (
                                <img src={r.avatar_url} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">{r.name?.charAt(0)}</div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{r.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{r.axon_id}</p>
                              {r.college && <p className="text-xs text-muted-foreground">{r.college}</p>}
                            </div>
                          </button>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="font-mono text-[10px]" onClick={() => navigate(`/profile?id=${r.user_id}`)}>
                              VIEW
                            </Button>
                            <Button variant="outline" size="sm" className="font-mono text-[10px]" onClick={() => navigate(`/messages?user=${r.user_id}`)}>
                              <MessageSquare className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {!friendSearch && (
                  <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground font-mono">Search by name, Axon ID, or college</p>
                    <p className="text-xs text-muted-foreground mt-1">Find friends and start conversations</p>
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
