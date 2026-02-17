import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  expires_at: string;
  profile?: { name: string; avatar_url: string | null; axon_id: string | null };
  view_count?: number;
  viewed?: boolean;
}

interface GroupedStories {
  user_id: string;
  profile: { name: string; avatar_url: string | null; axon_id: string | null };
  stories: Story[];
  hasUnviewed: boolean;
}

export const Stories = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [grouped, setGrouped] = useState<GroupedStories[]>([]);
  const [viewingGroup, setViewingGroup] = useState<GroupedStories | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchStories();
  }, [userId]);

  const fetchStories = async () => {
    // Get users I follow
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    const followingIds = (follows || []).map(f => f.following_id);
    // Include own stories
    const allIds = [...followingIds, userId];

    // Get non-expired stories from followed users + self
    const { data: storiesData } = await supabase
      .from("stories")
      .select("*")
      .in("user_id", allIds)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (!storiesData || storiesData.length === 0) {
      setGrouped([]);
      return;
    }

    // Get profiles
    const userIds = [...new Set(storiesData.map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url, axon_id")
      .in("user_id", userIds);

    // Get my views
    const storyIds = storiesData.map(s => s.id);
    const { data: myViews } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", userId)
      .in("story_id", storyIds);

    const viewedIds = new Set((myViews || []).map(v => v.story_id));

    const enriched: Story[] = storiesData.map(s => ({
      ...s,
      profile: (profiles || []).find(p => p.user_id === s.user_id) || { name: "Unknown", avatar_url: null, axon_id: null },
      viewed: viewedIds.has(s.id),
    }));

    // Group by user
    const groups = new Map<string, GroupedStories>();
    enriched.forEach(s => {
      if (!groups.has(s.user_id)) {
        groups.set(s.user_id, {
          user_id: s.user_id,
          profile: s.profile!,
          stories: [],
          hasUnviewed: false,
        });
      }
      const g = groups.get(s.user_id)!;
      g.stories.push(s);
      if (!s.viewed) g.hasUnviewed = true;
    });

    // Put own stories first
    const result = Array.from(groups.values());
    result.sort((a, b) => {
      if (a.user_id === userId) return -1;
      if (b.user_id === userId) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });

    setGrouped(result);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileName = `stories/${userId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(fileName, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);

      const { error } = await supabase.from("stories").insert({
        user_id: userId,
        image_url: publicUrl,
      });
      if (error) throw error;
      toast({ title: "Story posted!", description: "Visible to followers for 24 hours" });
      fetchStories();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const openStory = async (group: GroupedStories) => {
    setViewingGroup(group);
    const firstUnviewed = group.stories.findIndex(s => !s.viewed);
    setViewingIndex(firstUnviewed >= 0 ? firstUnviewed : 0);
    // Mark as viewed
    const story = group.stories[firstUnviewed >= 0 ? firstUnviewed : 0];
    if (story && !story.viewed && story.user_id !== userId) {
      await supabase.from("story_views").insert({ story_id: story.id, viewer_id: userId });
    }
    startAutoProgress(group.stories.length, firstUnviewed >= 0 ? firstUnviewed : 0);
  };

  const startAutoProgress = (total: number, startIdx: number) => {
    if (progressRef.current) clearTimeout(progressRef.current);
    let idx = startIdx;
    const advance = () => {
      idx++;
      if (idx >= total) {
        setViewingGroup(null);
        return;
      }
      setViewingIndex(idx);
      progressRef.current = setTimeout(advance, 5000);
    };
    progressRef.current = setTimeout(advance, 5000);
  };

  const closeViewer = () => {
    if (progressRef.current) clearTimeout(progressRef.current);
    setViewingGroup(null);
  };

  const goNext = () => {
    if (!viewingGroup) return;
    if (progressRef.current) clearTimeout(progressRef.current);
    if (viewingIndex < viewingGroup.stories.length - 1) {
      const next = viewingIndex + 1;
      setViewingIndex(next);
      startAutoProgress(viewingGroup.stories.length, next);
    } else {
      closeViewer();
    }
  };

  const goPrev = () => {
    if (!viewingGroup) return;
    if (progressRef.current) clearTimeout(progressRef.current);
    if (viewingIndex > 0) {
      const prev = viewingIndex - 1;
      setViewingIndex(prev);
      startAutoProgress(viewingGroup.stories.length, prev);
    }
  };

  const currentStory = viewingGroup?.stories[viewingIndex];

  return (
    <>
      {/* Stories bar */}
      <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {/* Add story button */}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-1 shrink-0"
          disabled={uploading}
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-secondary/50 hover:bg-secondary transition-colors">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">YOUR STORY</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />

        {/* Story circles */}
        {grouped.map(g => (
          <button
            key={g.user_id}
            onClick={() => openStory(g)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className={`w-16 h-16 rounded-full p-0.5 ${g.hasUnviewed ? "bg-gradient-to-tr from-primary to-accent" : "bg-border"}`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-secondary">
                {g.profile.avatar_url ? (
                  <img src={g.profile.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {g.profile.name?.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[64px]">
              {g.user_id === userId ? "YOU" : g.profile.name?.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Full-screen story viewer */}
      <AnimatePresence>
        {viewingGroup && currentStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={closeViewer}
          >
            {/* Progress bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
              {viewingGroup.stories.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      i < viewingIndex ? "bg-white w-full" : i === viewingIndex ? "bg-white w-full animate-pulse" : "w-0"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20">
                  {viewingGroup.profile.avatar_url ? (
                    <img src={viewingGroup.profile.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                      {viewingGroup.profile.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{viewingGroup.profile.name}</p>
                  <p className="text-white/60 text-[10px] font-mono">
                    {new Date(currentStory.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); closeViewer(); }} className="text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Image */}
            <img
              src={currentStory.image_url}
              alt=""
              className="max-h-[80vh] max-w-full object-contain"
              onClick={e => e.stopPropagation()}
            />

            {/* Caption */}
            {currentStory.caption && (
              <div className="absolute bottom-16 left-4 right-4 text-center z-10">
                <p className="text-white text-sm bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                  {currentStory.caption}
                </p>
              </div>
            )}

            {/* Navigation */}
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
