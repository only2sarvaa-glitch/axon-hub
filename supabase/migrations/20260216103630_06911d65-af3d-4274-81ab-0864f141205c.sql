
-- Fix ALL RLS policies: change from RESTRICTIVE to PERMISSIVE
-- Drop all existing restrictive policies and recreate as permissive

-- certificates
DROP POLICY IF EXISTS "Anyone can verify certificates" ON public.certificates;
DROP POLICY IF EXISTS "Organizers can issue certificates" ON public.certificates;
DROP POLICY IF EXISTS "Students can view own certificates" ON public.certificates;

CREATE POLICY "Anyone can verify certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Organizers can issue certificates" ON public.certificates FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  EXISTS (SELECT 1 FROM hackathons h WHERE h.id = certificates.hackathon_id AND h.organizer_id = auth.uid())
);
CREATE POLICY "Students can view own certificates" ON public.certificates FOR SELECT USING (
  student_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- chat_messages
DROP POLICY IF EXISTS "Chat participants can read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;

CREATE POLICY "Chat participants can read messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Participants can send messages" ON public.chat_messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- hackathons
DROP POLICY IF EXISTS "Anyone can view hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Approved organizers can create hackathons" ON public.hackathons;
DROP POLICY IF EXISTS "Organizer can update own hackathons" ON public.hackathons;

CREATE POLICY "Anyone can view hackathons" ON public.hackathons FOR SELECT USING (true);
CREATE POLICY "Approved organizers can create hackathons" ON public.hackathons FOR INSERT WITH CHECK (
  organizer_id = auth.uid() AND has_role(auth.uid(), 'organizer'::app_role)
);
CREATE POLICY "Organizer can update own hackathons" ON public.hackathons FOR UPDATE USING (
  organizer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- organizer_applications
DROP POLICY IF EXISTS "Admin can update applications" ON public.organizer_applications;
DROP POLICY IF EXISTS "Applicants can view own applications" ON public.organizer_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.organizer_applications;

CREATE POLICY "Applicants can view own or admin view all" ON public.organizer_applications FOR SELECT USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Users can create applications" ON public.organizer_applications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can update applications" ON public.organizer_applications FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());

-- team_members
DROP POLICY IF EXISTS "Team leaders can add members" ON public.team_members;
DROP POLICY IF EXISTS "View team members" ON public.team_members;

CREATE POLICY "View team members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Team leaders can add members" ON public.team_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND t.leader_id = auth.uid()) OR user_id = auth.uid()
);

-- teams
DROP POLICY IF EXISTS "Organizer/admin can update teams" ON public.teams;
DROP POLICY IF EXISTS "Students can create teams" ON public.teams;
DROP POLICY IF EXISTS "View teams in hackathons" ON public.teams;

CREATE POLICY "View teams in hackathons" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Students can create teams" ON public.teams FOR INSERT WITH CHECK (leader_id = auth.uid());
CREATE POLICY "Organizer/admin can update teams" ON public.teams FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM hackathons h WHERE h.id = teams.hackathon_id AND h.organizer_id = auth.uid())
);

-- user_roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read certificates" ON storage.objects FOR SELECT USING (bucket_id = 'certificates');
CREATE POLICY "Authenticated users can upload certificates" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificates' AND auth.role() = 'authenticated');
