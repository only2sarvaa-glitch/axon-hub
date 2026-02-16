
-- Add poster_url and demo_ppt_url to hackathons
ALTER TABLE public.hackathons ADD COLUMN IF NOT EXISTS poster_url text DEFAULT '';
ALTER TABLE public.hackathons ADD COLUMN IF NOT EXISTS demo_ppt_url text DEFAULT '';

-- Create storage buckets for posters, avatars, demo-ppts
INSERT INTO storage.buckets (id, name, public) VALUES ('posters', 'posters', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('demo-ppts', 'demo-ppts', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for posters
CREATE POLICY "Public read posters" ON storage.objects FOR SELECT USING (bucket_id = 'posters');
CREATE POLICY "Auth upload posters" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'posters' AND auth.role() = 'authenticated');

-- Storage policies for avatars
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Storage policies for demo-ppts
CREATE POLICY "Public read demo-ppts" ON storage.objects FOR SELECT USING (bucket_id = 'demo-ppts');
CREATE POLICY "Auth upload demo-ppts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'demo-ppts' AND auth.role() = 'authenticated');

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  link text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Authenticated insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Follows table
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users follow" ON public.follows FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY "Users unfollow" ON public.follows FOR DELETE USING (follower_id = auth.uid());

-- Private messages table
CREATE TABLE public.private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own messages" ON public.private_messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users send messages" ON public.private_messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users update own received" ON public.private_messages FOR UPDATE USING (receiver_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;

-- Community posts table
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  post_type text NOT NULL DEFAULT 'text',
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Users create posts" ON public.community_posts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own posts" ON public.community_posts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own posts" ON public.community_posts FOR DELETE USING (user_id = auth.uid());

-- Post likes table
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users like" ON public.post_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users unlike" ON public.post_likes FOR DELETE USING (user_id = auth.uid());

-- Post comments table
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users create comments" ON public.post_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own comments" ON public.post_comments FOR DELETE USING (user_id = auth.uid());

-- Trigger for community_posts updated_at
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
