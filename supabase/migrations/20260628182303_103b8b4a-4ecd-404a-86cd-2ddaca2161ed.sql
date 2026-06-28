
-- 1) Add verification_status to company_profiles (covers both empresa and persona_fisica via entity_type)
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified';

ALTER TABLE public.company_profiles
  DROP CONSTRAINT IF EXISTS company_profiles_verification_status_check;
ALTER TABLE public.company_profiles
  ADD CONSTRAINT company_profiles_verification_status_check
  CHECK (verification_status IN ('unverified','pending','verified','rejected'));

-- 2) User consents (legal acceptance audit)
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  cookies_version TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_consents_user_idx ON public.user_consents(user_id);

GRANT SELECT, INSERT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_consents_select_own" ON public.user_consents;
CREATE POLICY "user_consents_select_own" ON public.user_consents
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "user_consents_insert_own" ON public.user_consents;
CREATE POLICY "user_consents_insert_own" ON public.user_consents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 3) Verification requests
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('company','individual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  legal_name TEXT NOT NULL,
  country TEXT NOT NULL,
  doc_path TEXT,
  reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_requests_user_idx ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON public.verification_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vr_select_own_or_admin" ON public.verification_requests;
CREATE POLICY "vr_select_own_or_admin" ON public.verification_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "vr_insert_own" ON public.verification_requests;
CREATE POLICY "vr_insert_own" ON public.verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "vr_update_admin" ON public.verification_requests;
CREATE POLICY "vr_update_admin" ON public.verification_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_vr_updated_at BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Verification audit log
CREATE TABLE IF NOT EXISTS public.verification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.verification_audit TO authenticated;
GRANT ALL ON public.verification_audit TO service_role;
ALTER TABLE public.verification_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "va_select_admin" ON public.verification_audit;
CREATE POLICY "va_select_admin" ON public.verification_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "va_insert_admin" ON public.verification_audit;
CREATE POLICY "va_insert_admin" ON public.verification_audit
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) Tighten publish gating: require verified status
CREATE OR REPLACE FUNCTION public.enforce_profile_complete_before_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_status TEXT;
BEGIN
  IF length(btrim(coalesce(NEW.title,''))) < 5 OR length(btrim(coalesce(NEW.title,''))) > 120 THEN
    RAISE EXCEPTION 'project_title_invalid' USING HINT = 'Title must be 5-120 characters';
  END IF;
  IF length(btrim(coalesce(NEW.description,''))) < 20 OR length(btrim(coalesce(NEW.description,''))) > 1000 THEN
    RAISE EXCEPTION 'project_description_invalid' USING HINT = 'Description must be 20-1000 characters';
  END IF;
  IF NEW.capital_required IS NULL OR NEW.capital_required <= 0 THEN
    RAISE EXCEPTION 'project_capital_invalid' USING HINT = 'Capital must be greater than 0';
  END IF;

  IF NEW.status = 'published' THEN
    IF NOT public.company_profile_complete(NEW.company_id) THEN
      RAISE EXCEPTION 'profile_incomplete' USING HINT = 'Complete your profile before publishing';
    END IF;
    SELECT verification_status INTO v_status FROM public.company_profiles WHERE user_id = NEW.company_id;
    IF v_status IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'verification_required' USING HINT = 'Your account must be verified before publishing';
    END IF;
  END IF;

  RETURN NEW;
END; $function$;

-- 6) Helper: my verification status (used by client)
CREATE OR REPLACE FUNCTION public.my_verification_status()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(verification_status,'unverified') FROM public.company_profiles WHERE user_id = auth.uid()
$$;

-- 7) Storage RLS for verification-docs bucket (bucket created via tool)
DROP POLICY IF EXISTS "verif_docs_insert_own" ON storage.objects;
CREATE POLICY "verif_docs_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "verif_docs_select_own_or_admin" ON storage.objects;
CREATE POLICY "verif_docs_select_own_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "verif_docs_delete_own_or_admin" ON storage.objects;
CREATE POLICY "verif_docs_delete_own_or_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'verification-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
