import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Hexagon, Heart, MessageCircle, Send, Image, Trash2, User
} from "lucide-react";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string;
  post_type: string;
  likes_count: number;
  created_at: string;
  profile?: { name: string; avatar_url: string | null; axon_id: string | null };
  isLiked?: boolean;
  comments_count?: number;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { name: string; avatar_url: string | null };
}

const Community = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newContent, setNewContent] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth/student"); return; }
      setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (user) fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    const { data: postsData } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData) return;

    const userIds = [...new Set(postsData.map((p: any) => p.user_id))];
    const [profilesRes, likesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, name, avatar_url, axon_id").in("user_id", userIds),
      user ? supabase.from("post_likes").select("post_id").eq("user_id", user.id) : { data: [] },
    ]);

    // Get comment counts
    const postIds = postsData.map((p: any) => p.id);
    const { data: commentCounts } = await supabase.from("post_comments").select("post_id").in("post_id", postIds);

    const likedPostIds = new Set((likesRes.data || []).map((l: any) => l.post_id));
    const commentCountMap = new Map<string, number>();
    (commentCounts || []).forEach((c: any) => {
      commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
    });

    const enriched = postsData.map((p: any) => ({
      ...p,
      profile: (profilesRes.data || []).find((pr: any) => pr.user_id === p.user_id),
      isLiked: likedPostIds.has(p.id),
      comments_count: commentCountMap.get(p.id) || 0,
    }));

    setPosts(enriched as Post[]);
  };

  const handlePost = async () => {
    if (!newContent.trim() && !newImage) return;
    setPosting(true);

    let imageUrl = "";
    if (newImage) {
      const fileName = `${Date.now()}_${newImage.name}`;
      const { error } = await supabase.storage.from("avatars").upload(`posts/${fileName}`, newImage);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(`posts/${fileName}`);
        imageUrl = publicUrl;
      }
    }

    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      content: newContent.trim(),
      image_url: imageUrl,
      post_type: imageUrl ? "image" : "text",
    });

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setNewContent("");
      setNewImage(null);
      fetchPosts();
    }
    setPosting(false);
  };

  const handleLike = async (post: Post) => {
    if (post.isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      await supabase.from("community_posts").update({ likes_count: Math.max(0, post.likes_count - 1) }).eq("id", post.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      await supabase.from("community_posts").update({ likes_count: post.likes_count + 1 }).eq("id", post.id);
    }
    fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from("community_posts").delete().eq("id", postId);
    fetchPosts();
  };

  const openComments = async (postId: string) => {
    if (expandedComments === postId) { setExpandedComments(null); return; }
    setExpandedComments(postId);
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profs } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
      const enriched = data.map((c: any) => ({
        ...c,
        profile: (profs || []).find((p: any) => p.user_id === c.user_id),
      }));
      setComments(enriched as Comment[]);
    } else {
      setComments([]);
    }
  };

  const sendComment = async (postId: string) => {
    if (!commentInput.trim()) return;
    await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content: commentInput.trim() });
    setCommentInput("");
    openComments(postId);
    fetchPosts();
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
        <span className="text-xs font-mono text-muted-foreground tracking-wider">COMMUNITY</span>
      </nav>

      <main className="max-w-2xl mx-auto px-8 py-6">
        {/* Create post */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 mb-6">
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full bg-transparent resize-none text-sm placeholder:text-muted-foreground focus:outline-none mb-3"
          />
          {newImage && (
            <div className="relative mb-3">
              <img src={URL.createObjectURL(newImage)} alt="Preview" className="rounded-lg max-h-48 object-cover" />
              <button onClick={() => setNewImage(null)} className="absolute top-1 right-1 bg-background/80 rounded-full p-1"><Trash2 className="w-3 h-3" /></button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <label className="cursor-pointer p-2 rounded-lg hover:bg-secondary transition-colors">
              <Image className="w-4 h-4 text-muted-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={e => setNewImage(e.target.files?.[0] || null)} />
            </label>
            <Button onClick={handlePost} disabled={posting || (!newContent.trim() && !newImage)} className="font-mono text-xs bg-foreground text-background hover:bg-foreground/90">
              {posting ? "POSTING..." : "POST"}
            </Button>
          </div>
        </motion.div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map(post => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 pb-2">
                <button onClick={() => navigate(`/profile?id=${post.user_id}`)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden">
                    {post.profile?.avatar_url ? <img src={post.profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">{post.profile?.name?.charAt(0)}</div>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{post.profile?.name || "Unknown"}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{post.profile?.axon_id} • {new Date(post.created_at).toLocaleDateString()}</p>
                  </div>
                </button>
                {post.user_id === user?.id && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeletePost(post.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 p-0">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Content */}
              {post.content && <p className="px-4 text-sm whitespace-pre-wrap">{post.content}</p>}
              {post.image_url && <img src={post.image_url} alt="" className="w-full mt-3" />}

              {/* Actions */}
              <div className="flex items-center gap-4 p-4 pt-3">
                <button onClick={() => handleLike(post)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Heart className={`w-4 h-4 ${post.isLiked ? "fill-destructive text-destructive" : ""}`} />
                  {post.likes_count}
                </button>
                <button onClick={() => openComments(post.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  {post.comments_count || 0}
                </button>
              </div>

              {/* Comments */}
              <AnimatePresence>
                {expandedComments === post.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border">
                    <div className="p-4 space-y-3">
                      {comments.map(c => (
                        <div key={c.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary overflow-hidden shrink-0">
                            {c.profile?.avatar_url ? <img src={c.profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-muted-foreground">{c.profile?.name?.charAt(0)}</div>}
                          </div>
                          <div className="bg-secondary/30 rounded-lg px-3 py-1.5 flex-1">
                            <p className="text-[11px] font-semibold">{c.profile?.name}</p>
                            <p className="text-xs text-muted-foreground">{c.content}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && sendComment(post.id)}
                          placeholder="Write a comment..."
                          className="bg-secondary/30 border-border text-xs"
                        />
                        <Button size="sm" variant="ghost" onClick={() => sendComment(post.id)}><Send className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {posts.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <User className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground font-mono">No posts yet. Be the first!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Community;
