
-- =========================================================================
-- subscription_plans
-- =========================================================================
CREATE TABLE public.subscription_plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  sort_order INTEGER NOT NULL DEFAULT 0,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_read_all_authenticated"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER subscription_plans_set_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed plans
INSERT INTO public.subscription_plans (code, name, price_cents, currency, sort_order, limits, features) VALUES
  ('free', 'Free', 0, 'EUR', 0,
   jsonb_build_object(
     'max_active_projects', 1,
     'max_featured_projects', 0,
     'team_members', 1
   ),
   jsonb_build_object(
     'basic_stats', true,
     'advanced_analytics', false,
     'featured_projects', false,
     'priority_visibility', false,
     'team_members', false,
     'dashboard_exports', false,
     'priority_support', false
   )
  ),
  ('pro', 'Pro', 0, 'EUR', 1,
   jsonb_build_object(
     'max_active_projects', 5,
     'max_featured_projects', 1,
     'team_members', 1
   ),
   jsonb_build_object(
     'basic_stats', true,
     'advanced_analytics', true,
     'featured_projects', true,
     'priority_visibility', true,
     'team_members', false,
     'dashboard_exports', false,
     'priority_support', false
   )
  ),
  ('business', 'Business', 0, 'EUR', 2,
   jsonb_build_object(
     'max_active_projects', NULL,
     'max_featured_projects', NULL,
     'team_members', NULL
   ),
   jsonb_build_object(
     'basic_stats', true,
     'advanced_analytics', true,
     'featured_projects', true,
     'priority_visibility', true,
     'team_members', true,
     'dashboard_exports', true,
     'priority_support', true
   )
  );

-- =========================================================================
-- user_plan
-- =========================================================================
CREATE TABLE public.user_plan (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES public.subscription_plans(code) DEFAULT 'free',
  billing_status TEXT NOT NULL DEFAULT 'inactive', -- inactive | trialing | active | past_due | canceled
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  external_customer_id TEXT NULL,
  external_subscription_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_plan TO authenticated;
GRANT ALL ON public.user_plan TO service_role;

ALTER TABLE public.user_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_plan_read_own"
ON public.user_plan FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow self-insert defaulting to free (server logic will normally manage this)
CREATE POLICY "user_plan_insert_own_free"
ON public.user_plan FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND plan_code = 'free');

-- Admins manage all
CREATE POLICY "user_plan_admin_all"
ON public.user_plan FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER user_plan_set_updated_at
BEFORE UPDATE ON public.user_plan
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill: assign 'free' to every existing user
INSERT INTO public.user_plan (user_id, plan_code)
SELECT id, 'free' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Auto-assign 'free' to every new user (extend handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'locale', 'es')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_plan (user_id, plan_code)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- =========================================================================
-- feature_flags
-- =========================================================================
CREATE TABLE public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flags_read_all_authenticated"
ON public.feature_flags FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER feature_flags_set_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('billing_enabled', false, 'Master switch for paid billing flows'),
  ('analytics_advanced', false, 'Show advanced analytics widgets to eligible plans'),
  ('featured_projects', false, 'Allow Pro/Business to feature projects')
ON CONFLICT (key) DO NOTHING;

-- =========================================================================
-- Helper functions
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_my_plan_code()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan_code FROM public.user_plan WHERE user_id = auth.uid()),
    'free'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_plan_limit(_code TEXT, _key TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(limits->>_key, '')::INTEGER
  FROM public.subscription_plans
  WHERE code = _code
$$;

-- =========================================================================
-- Enforce Free plan project cap (1 active project)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enforce_plan_project_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_cap  INTEGER;
  v_active INTEGER;
BEGIN
  -- Only relevant when project would be published
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  SELECT plan_code INTO v_plan FROM public.user_plan WHERE user_id = NEW.company_id;
  v_plan := COALESCE(v_plan, 'free');

  SELECT NULLIF(limits->>'max_active_projects','')::INTEGER
    INTO v_cap
  FROM public.subscription_plans WHERE code = v_plan;

  -- NULL cap means unlimited
  IF v_cap IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_active
  FROM public.projects
  WHERE company_id = NEW.company_id
    AND status = 'published'
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_active >= v_cap THEN
    -- Force to draft instead of erroring (graceful UX)
    NEW.status := 'draft';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_enforce_plan_cap ON public.projects;
CREATE TRIGGER projects_enforce_plan_cap
BEFORE INSERT OR UPDATE OF status ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_project_cap();

REVOKE EXECUTE ON FUNCTION public.enforce_plan_project_cap() FROM PUBLIC, anon, authenticated;
