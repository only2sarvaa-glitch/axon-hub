
-- Add ppt_url to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS ppt_url text DEFAULT '';

-- Add brochure_url to hackathons table
ALTER TABLE public.hackathons ADD COLUMN IF NOT EXISTS brochure_url text DEFAULT '';

-- Create storage bucket for PPTs
INSERT INTO storage.buckets (id, name, public) VALUES ('ppts', 'ppts', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for ppts bucket
CREATE POLICY "Anyone can view ppts" ON storage.objects FOR SELECT USING (bucket_id = 'ppts');
CREATE POLICY "Authenticated users can upload ppts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ppts' AND auth.uid() IS NOT NULL);

-- Create storage bucket for brochures
INSERT INTO storage.buckets (id, name, public) VALUES ('brochures', 'brochures', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Anyone can view brochures" ON storage.objects FOR SELECT USING (bucket_id = 'brochures');
CREATE POLICY "Organizers can upload brochures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'brochures' AND auth.uid() IS NOT NULL);

-- Fix all RLS policies to be PERMISSIVE (drop RESTRICTIVE ones, recreate as PERMISSIVE)

-- certificates
DROP POLICY IF EXISTS "Anyone can verify certificates" ON public.certificates;
DROP POLICY IF EXISTS "Organizers can issue certificates" ON public.certificates;
DROP POLICY IF EXISTS "Students can view own certificates" ON public.certificates;

CREATE POLICY "Anyone can verify certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Organizers can issue certificates" ON public.certificates FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM hackathons h WHERE h.id = certificates.hackathon_id AND h.organizer_id = auth.uid())
);

-- chat_messages
DROP POLICY IF EXISTS "Chat participants can read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;

CREATE POLICY "Chat participants can read messages" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Participants can send messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- hackathons
DROP POLICY IF EXISTS "Anyone can view hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Approved organizers can create hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Organizer can update own hackathons" ON public.hackathons;

CREATE POLICY "Anyone can view hackathons" ON public.hackathons FOR SELECT USING (true);
CREATE POLICY "Approved organizers can create hackathons" ON public.hackathons FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid() AND has_role(auth.uid(), 'organizer'::app_role));
CREATE POLICY "Organizer can update own hackathons" ON public.hackathons FOR UPDATE TO authenticated USING (organizer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- organizer_applications
DROP POLICY IF EXISTS "Applicants can view own or admin view all" ON public.organizer_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.organizer_applications;
DROP POLICY IF EXISTS "Admin can update applications" ON public.organizer_applications;

CREATE POLICY "Applicants can view own or admin view all" ON public.organizer_applications FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create applications" ON public.organizer_applications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can update applications" ON public.organizer_applications FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- team_members
DROP POLICY IF EXISTS "View team members" ON public.team_members;
DROP POLICY IF EXISTS "Team leaders can add members" ON public.team_members;

CREATE POLICY "View team members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Team leaders can add members" ON public.team_members FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND t.leader_id = auth.uid()) OR user_id = auth.uid()
);

-- teams
DROP POLICY IF EXISTS "View teams in hackathons" ON public.teams;
DROP POLICY IF EXISTS "Students can create teams" ON public.teams;
DROP POLICY IF EXISTS "Organizer/admin can update teams" ON public.teams;

CREATE POLICY "View teams in hackathons" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Students can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (leader_id = auth.uid());
CREATE POLICY "Organizer/admin can update teams" ON public.teams FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM hackathons h WHERE h.id = teams.hackathon_id AND h.organizer_id = auth.uid())
);

-- user_roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Recreate the handle_new_user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
