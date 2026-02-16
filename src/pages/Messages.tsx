import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmojiPicker } from "@/components/EmojiPicker";
import {
  ArrowLeft, Hexagon, Send, X, Search, User
} from "lucide-react";

interface Profile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  axon_id: string | null;
}

interface PrivateMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  user_id: string;
  name: string;
  avatar_url: string | null;
  axon_id: string | null;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

const Messages = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const openWithUser = searchParams.get("user");

  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(openWithUser);
  const [chatProfile, setChatProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth/student"); return; }
      setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    if (openWithUser) openChat(openWithUser);
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("private_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!msgs) return;

    // Group by conversation partner
    const convMap = new Map<string, { msgs: PrivateMessage[] }>();
    msgs.forEach((m: any) => {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!convMap.has(partnerId)) convMap.set(partnerId, { msgs: [] });
      convMap.get(partnerId)!.msgs.push(m);
    });

    const partnerIds = [...convMap.keys()];
    if (partnerIds.length === 0) { setConversations([]); return; }

    const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url, axon_id").in("user_id", partnerIds);

    const convs: Conversation[] = partnerIds.map(pid => {
      const p = (profiles || []).find((pr: any) => pr.user_id === pid);
      const pMsgs = convMap.get(pid)!.msgs;
      const unread = pMsgs.filter(m => m.receiver_id === user.id && !m.is_read).length;
      return {
        user_id: pid,
        name: p?.name || "Unknown",
        avatar_url: p?.avatar_url || null,
        axon_id: p?.axon_id || null,
        lastMessage: pMsgs[0]?.message || "",
        lastTime: pMsgs[0]?.created_at || "",
        unread,
      };
    }).sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());

    setConversations(convs);
  };

  const openChat = async (partnerId: string) => {
    setActiveChat(partnerId);
    const { data: prof } = await supabase.from("profiles").select("user_id, name, avatar_url, axon_id").eq("user_id", partnerId).single();
    setChatProfile(prof as Profile | null);

    const { data: msgs } = await supabase
      .from("private_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((msgs || []) as PrivateMessage[]);

    // Mark as read
    await supabase.from("private_messages").update({ is_read: true }).eq("sender_id", partnerId).eq("receiver_id", user.id).eq("is_read", false);
  };

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages", filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          const msg = payload.new as PrivateMessage;
          if (msg.sender_id === activeChat) {
            setMessages(prev => [...prev, msg]);
            supabase.from("private_messages").update({ is_read: true }).eq("id", msg.id);
          }
          fetchConversations();
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages", filter: `sender_id=eq.${user.id}` },
        (payload) => {
          const msg = payload.new as PrivateMessage;
          if (msg.receiver_id === activeChat) {
            setMessages(prev => [...prev, msg]);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeChat]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChat || !user) return;
    await supabase.from("private_messages").insert({
      sender_id: user.id,
      receiver_id: activeChat,
      message: input.trim(),
      message_type: "text",
    });
    setInput("");
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url, axon_id")
      .or(`axon_id.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,college.ilike.%${searchQuery}%`)
      .neq("user_id", user?.id)
      .limit(10);
    setSearchResults((data || []) as Profile[]);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex items-center gap-2">
            <Hexagon className="w-4 h-4 text-foreground" strokeWidth={1.5} />
            <span className="font-mono text-lg font-bold tracking-[0.3em] text-foreground">AXON</span>
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground tracking-wider">MESSAGES</span>
      </nav>

      <main className="max-w-4xl mx-auto flex h-[calc(100vh-65px)]">
        {/* Sidebar */}
        <div className={`w-80 border-r border-border flex flex-col ${activeChat ? "hidden md:flex" : "flex w-full md:w-80"}`}>
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, Axon ID, or college..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="bg-card border-border text-xs"
              />
              <Button variant="outline" size="sm" onClick={handleSearch}><Search className="w-3 h-3" /></Button>
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="border-b border-border">
              <p className="text-[10px] font-mono text-muted-foreground px-3 pt-2 tracking-wider">SEARCH RESULTS</p>
              {searchResults.map(r => (
                <button key={r.user_id} onClick={() => { openChat(r.user_id); setSearchResults([]); setSearchQuery(""); }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden shrink-0">
                    {r.avatar_url ? <img src={r.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">{r.name?.charAt(0)}</div>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{r.axon_id}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && searchResults.length === 0 && (
              <div className="p-8 text-center">
                <User className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-mono">No conversations yet</p>
                <p className="text-[10px] text-muted-foreground mt-1">Search for someone to start chatting</p>
              </div>
            )}
            {conversations.map(c => (
              <button key={c.user_id} onClick={() => openChat(c.user_id)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors text-left ${activeChat === c.user_id ? "bg-secondary/20" : ""}`}>
                <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden shrink-0">
                  {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">{c.name?.charAt(0)}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono flex items-center justify-center">{c.unread}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${!activeChat ? "hidden md:flex" : "flex"}`}>
          {!activeChat ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground font-mono text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setActiveChat(null)}><ArrowLeft className="w-4 h-4" /></Button>
                {chatProfile && (
                  <button onClick={() => navigate(`/profile?id=${chatProfile.user_id}`)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden">
                      {chatProfile.avatar_url ? <img src={chatProfile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">{chatProfile.name?.charAt(0)}</div>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{chatProfile.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{chatProfile.axon_id}</p>
                    </div>
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? "items-end" : "items-start"}`}>
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

              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2 items-center">
                <EmojiPicker onSelect={emoji => setInput(prev => prev + emoji)} />
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="bg-card border-border flex-1"
                />
                <Button onClick={sendMessage} size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Messages;
