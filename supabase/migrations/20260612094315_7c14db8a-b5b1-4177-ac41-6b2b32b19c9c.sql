
-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('empresa', 'inversor', 'admin');
CREATE TYPE public.project_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE public.business_stage AS ENUM ('idea', 'crecimiento', 'expansion');
CREATE TYPE public.investment_type AS ENUM ('equity', 'prestamo', 'joint_venture', 'convertible', 'otro');
CREATE TYPE public.risk_level AS ENUM ('bajo', 'medio', 'alto');
CREATE TYPE public.investor_kind AS ENUM ('personal', 'corporativo');
CREATE TYPE public.contact_status AS ENUM ('pending', 'accepted', 'rejected');

-- ===== updated_at trigger fn =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'es',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() ORDER BY
    CASE role WHEN 'admin' THEN 1 WHEN 'empresa' THEN 2 WHEN 'inversor' THEN 3 END
  LIMIT 1
$$;

-- Now admin policies on profiles & user_roles using has_role
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Trigger: create profile on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'locale', 'es')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== COMPANY PROFILES =====
CREATE TABLE public.company_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  website TEXT,
  country TEXT,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.company_profiles TO authenticated;
GRANT ALL ON public.company_profiles TO service_role;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_profiles_select_all" ON public.company_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "company_profiles_modify_own" ON public.company_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "company_profiles_admin" ON public.company_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_company_profiles_updated_at BEFORE UPDATE ON public.company_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== INVESTOR PROFILES =====
CREATE TABLE public.investor_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.investor_kind NOT NULL DEFAULT 'personal',
  display_name TEXT,
  sectors TEXT[] NOT NULL DEFAULT '{}',
  ticket_min NUMERIC,
  ticket_max NUMERIC,
  countries TEXT[] NOT NULL DEFAULT '{}',
  investment_types public.investment_type[] NOT NULL DEFAULT '{}',
  risk_level public.risk_level NOT NULL DEFAULT 'medio',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.investor_profiles TO authenticated;
GRANT ALL ON public.investor_profiles TO service_role;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investor_profiles_select_all" ON public.investor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "investor_profiles_modify_own" ON public.investor_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "investor_profiles_admin" ON public.investor_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_investor_profiles_updated_at BEFORE UPDATE ON public.investor_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== PROJECTS =====
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sector TEXT NOT NULL,
  investment_type public.investment_type NOT NULL,
  capital_required NUMERIC NOT NULL,
  ticket_min NUMERIC,
  ticket_max NUMERIC,
  country TEXT NOT NULL,
  stage public.business_stage NOT NULL,
  status public.project_status NOT NULL DEFAULT 'published',
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX projects_company_idx ON public.projects(company_id);
CREATE INDEX projects_status_idx ON public.projects(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select_published" ON public.projects FOR SELECT USING (status = 'published');
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT TO authenticated USING (company_id = auth.uid());
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT TO authenticated WITH CHECK (company_id = auth.uid() AND public.has_role(auth.uid(), 'empresa'));
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE TO authenticated USING (company_id = auth.uid()) WITH CHECK (company_id = auth.uid());
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE TO authenticated USING (company_id = auth.uid());
CREATE POLICY "projects_admin_all" ON public.projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== FAVORITES =====
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investor_id, project_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_own" ON public.favorites FOR ALL TO authenticated USING (investor_id = auth.uid()) WITH CHECK (investor_id = auth.uid());

-- ===== CONTACT REQUESTS =====
CREATE TABLE public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status public.contact_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investor_id, project_id)
);
CREATE INDEX contact_requests_investor_idx ON public.contact_requests(investor_id);
CREATE INDEX contact_requests_company_idx ON public.contact_requests(company_id);
GRANT SELECT, INSERT, UPDATE ON public.contact_requests TO authenticated;
GRANT ALL ON public.contact_requests TO service_role;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_select_parties" ON public.contact_requests FOR SELECT TO authenticated USING (investor_id = auth.uid() OR company_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cr_insert_investor" ON public.contact_requests FOR INSERT TO authenticated WITH CHECK (investor_id = auth.uid() AND public.has_role(auth.uid(),'inversor'));
CREATE POLICY "cr_update_company" ON public.contact_requests FOR UPDATE TO authenticated USING (company_id = auth.uid()) WITH CHECK (company_id = auth.uid());
CREATE TRIGGER trg_cr_updated_at BEFORE UPDATE ON public.contact_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== CONVERSATIONS =====
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_request_id UUID NOT NULL UNIQUE REFERENCES public.contact_requests(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_select_parties" ON public.conversations FOR SELECT TO authenticated USING (investor_id = auth.uid() OR company_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Auto-create conversation when contact request is accepted
CREATE OR REPLACE FUNCTION public.handle_contact_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    INSERT INTO public.conversations (contact_request_id, investor_id, company_id, project_id)
    VALUES (NEW.id, NEW.investor_id, NEW.company_id, NEW.project_id)
    ON CONFLICT (contact_request_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_contact_accepted AFTER UPDATE ON public.contact_requests FOR EACH ROW EXECUTE FUNCTION public.handle_contact_accepted();

-- ===== MESSAGES =====
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_parties" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.investor_id = auth.uid() OR c.company_id = auth.uid()))
);
CREATE POLICY "messages_insert_parties" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.investor_id = auth.uid() OR c.company_id = auth.uid()))
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ===== MATCH SCORES (cache) =====
CREATE TABLE public.match_scores (
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (investor_id, project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_scores TO authenticated;
GRANT ALL ON public.match_scores TO service_role;
ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_scores_select_own" ON public.match_scores FOR SELECT TO authenticated USING (
  investor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.company_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);

-- ===== Role assignment RPC (called from server fn) =====
CREATE OR REPLACE FUNCTION public.assign_my_role(_role public.app_role)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _role = 'admin' THEN RAISE EXCEPTION 'cannot self-assign admin'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RETURN;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), _role);
END; $$;
