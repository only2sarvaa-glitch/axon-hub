
-- Stories table (24hr expiry, followers only)
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view stories (filtering by follows done in app)
CREATE POLICY "Authenticated can view stories"
  ON public.stories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users create own stories"
  ON public.stories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own stories"
  ON public.stories FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Story views tracking
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view story_views"
  ON public.story_views FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert own views"
  ON public.story_views FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = auth.uid());

-- Function to auto-close expired hackathons
CREATE OR REPLACE FUNCTION public.auto_close_expired_hackathons()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.hackathons
  SET status = 'ended', updated_at = now()
  WHERE status = 'active'
    AND event_date IS NOT NULL
    AND event_date < CURRENT_DATE;
END;
$$;
