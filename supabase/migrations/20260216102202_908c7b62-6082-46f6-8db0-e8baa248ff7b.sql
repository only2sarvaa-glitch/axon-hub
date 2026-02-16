
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'student');

-- User roles table (security-critical: roles stored separately)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to check roles (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    axon_id TEXT UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    college TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Organizer applications
CREATE TABLE public.organizer_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    college_name TEXT NOT NULL,
    club_name TEXT NOT NULL,
    college_code TEXT NOT NULL,
    club_email TEXT NOT NULL,
    official_email TEXT NOT NULL,
    contact TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizer_applications ENABLE ROW LEVEL SECURITY;

-- Hackathons
CREATE TABLE public.hackathons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'Technical',
    description TEXT DEFAULT '',
    problem_statements TEXT DEFAULT '',
    location TEXT DEFAULT '',
    event_date DATE,
    entry_fee NUMERIC DEFAULT 0,
    cash_prize NUMERIC DEFAULT 0,
    team_size_limit INT DEFAULT 4,
    food_available BOOLEAN DEFAULT false,
    accommodation BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;

-- Teams
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    team_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    accommodation BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team members
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Certificates
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    axon_id TEXT NOT NULL,
    certificate_type TEXT NOT NULL DEFAULT 'participation' CHECK (certificate_type IN ('participation', 'winner')),
    file_url TEXT DEFAULT '',
    hash TEXT DEFAULT '',
    blockchain_tx TEXT DEFAULT '',
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Chat messages for events
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'pdf', 'video', 'link')),
    file_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Generate Axon ID function
CREATE OR REPLACE FUNCTION public.generate_axon_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
BEGIN
  new_id := 'AXN-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  RETURN new_id;
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  axon TEXT;
BEGIN
  -- Determine role from metadata
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  
  -- Generate Axon ID for students
  IF user_role = 'student' THEN
    axon := generate_axon_id();
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, name, college, email, phone, axon_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'college', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    axon
  );
  
  -- Insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- If organizer, also create application
  IF user_role = 'organizer' THEN
    INSERT INTO public.organizer_applications (
      user_id, college_name, club_name, college_code,
      club_email, official_email, contact
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'college_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'club_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'college_code', ''),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'official_email', ''),
      COALESCE(NEW.raw_user_meta_data->>'contact', '')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hackathons_updated_at
  BEFORE UPDATE ON public.hackathons FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizer_applications_updated_at
  BEFORE UPDATE ON public.organizer_applications FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- user_roles: users can read their own, admin can read all
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- profiles: public read, own update
CREATE POLICY "Profiles are viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- organizer_applications: own read, admin full access
CREATE POLICY "Applicants can view own applications" ON public.organizer_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create applications" ON public.organizer_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can update applications" ON public.organizer_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- hackathons: public read, organizer/admin create
CREATE POLICY "Anyone can view hackathons" ON public.hackathons
  FOR SELECT USING (true);

CREATE POLICY "Approved organizers can create hackathons" ON public.hackathons
  FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid() AND public.has_role(auth.uid(), 'organizer'));

CREATE POLICY "Organizer can update own hackathons" ON public.hackathons
  FOR UPDATE TO authenticated USING (organizer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- teams: hackathon participants can view, students can create
CREATE POLICY "View teams in hackathons" ON public.teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students can create teams" ON public.teams
  FOR INSERT TO authenticated WITH CHECK (leader_id = auth.uid());

CREATE POLICY "Organizer/admin can update teams" ON public.teams
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (SELECT 1 FROM public.hackathons h WHERE h.id = hackathon_id AND h.organizer_id = auth.uid())
  );

-- team_members
CREATE POLICY "View team members" ON public.team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team leaders can add members" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.leader_id = auth.uid())
    OR user_id = auth.uid()
  );

-- certificates: own read, organizer/admin create
CREATE POLICY "Students can view own certificates" ON public.certificates
  FOR SELECT TO authenticated USING (student_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Organizers can issue certificates" ON public.certificates
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (SELECT 1 FROM public.hackathons h WHERE h.id = hackathon_id AND h.organizer_id = auth.uid())
  );

-- Public certificate verification (anyone can verify by hash)
CREATE POLICY "Anyone can verify certificates" ON public.certificates
  FOR SELECT USING (true);

-- chat_messages: participants can read/write
CREATE POLICY "Chat participants can read messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Participants can send messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
