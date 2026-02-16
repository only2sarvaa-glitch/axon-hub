import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Camera, Edit2, Save, Hexagon, UserPlus, UserMinus,
  MessageSquare, Copy, MapPin, Mail, Phone
} from "lucide-react";

interface ProfileData {
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  axon_id: string | null;
  college: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const viewUserId = searchParams.get("id");

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", college: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth/student"); return; }
      setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const targetId = viewUserId || user.id;
    setIsOwnProfile(!viewUserId || viewUserId === user.id);
    fetchProfile(targetId);
    fetchFollowData(targetId);
  }, [user, viewUserId]);

  const fetchProfile = async (targetId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", targetId).single();
    if (data) {
      setProfile(data as ProfileData);
      setEditForm({ name: data.name || "", college: data.college || "", phone: data.phone || "" });
    }
  };

  const fetchFollowData = async (targetId: string) => {
    const [followersRes, followingRes] = await Promise.all([
      supabase.from("follows").select("id", { count: "exact" }).eq("following_id", targetId),
      supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", targetId),
    ]);
    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);

    if (user && targetId !== user.id) {
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", targetId).single();
      setIsFollowing(!!data);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const fileName = `${user.id}_${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(fileName, file);
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    toast({ title: "Avatar updated!" });
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update(editForm).eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Profile updated!" });
      setProfile(prev => prev ? { ...prev, ...editForm } : null);
      setEditing(false);
    }
    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user || !profile) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.user_id);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.user_id });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      // Send notification
      await supabase.from("notifications").insert({
        user_id: profile.user_id,
        type: "follow",
        title: "New Follower",
        message: `${user.user_metadata?.name || "Someone"} started following you`,
      });
    }
  };

  const copyAxonId = () => {
    if (profile?.axon_id) {
      navigator.clipboard.writeText(profile.axon_id);
      toast({ title: "Copied!" });
    }
  };

  if (!profile) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground font-mono text-sm">Loading...</div>
    </div>
  );

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
      </nav>

      <main className="max-w-2xl mx-auto px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Avatar + Name */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group mb-4">
              <div className="w-24 h-24 rounded-full bg-secondary border-2 border-border overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {profile.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <label className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-5 h-5 text-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
                </label>
              )}
            </div>

            {editing ? (
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="text-center text-xl font-bold bg-card border-border max-w-xs mb-2" />
            ) : (
              <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
            )}

            {profile.axon_id && (
              <button onClick={copyAxonId} className="flex items-center gap-1 text-xs font-mono text-muted-foreground bg-secondary px-3 py-1 rounded-full hover:text-foreground transition-colors mb-3">
                {profile.axon_id} <Copy className="w-3 h-3" />
              </button>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <p className="text-lg font-bold">{followersCount}</p>
                <p className="text-[10px] font-mono text-muted-foreground">FOLLOWERS</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{followingCount}</p>
                <p className="text-[10px] font-mono text-muted-foreground">FOLLOWING</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {isOwnProfile ? (
                editing ? (
                  <Button onClick={handleSave} disabled={loading} className="font-mono text-xs bg-foreground text-background hover:bg-foreground/90">
                    <Save className="w-3 h-3 mr-1" /> {loading ? "SAVING..." : "SAVE"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setEditing(true)} className="font-mono text-xs">
                    <Edit2 className="w-3 h-3 mr-1" /> EDIT PROFILE
                  </Button>
                )
              ) : (
                <>
                  <Button onClick={handleFollow} variant={isFollowing ? "outline" : "default"} className={`font-mono text-xs ${!isFollowing ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}>
                    {isFollowing ? <><UserMinus className="w-3 h-3 mr-1" /> UNFOLLOW</> : <><UserPlus className="w-3 h-3 mr-1" /> FOLLOW</>}
                  </Button>
                  <Button variant="outline" className="font-mono text-xs" onClick={() => navigate(`/messages?user=${profile.user_id}`)}>
                    <MessageSquare className="w-3 h-3 mr-1" /> MESSAGE
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            {editing ? (
              <>
                <div>
                  <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">COLLEGE</Label>
                  <Input value={editForm.college} onChange={e => setEditForm({ ...editForm, college: e.target.value })} className="mt-1 bg-background border-border" />
                </div>
                <div>
                  <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">PHONE</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1 bg-background border-border" />
                </div>
              </>
            ) : (
              <>
                {profile.college && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" /> {profile.college}
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" /> {profile.email}
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" /> {profile.phone}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Profile;
