
-- Add trust fields to verification_requests and company_profiles
ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS linkedin TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS trust_level TEXT NOT NULL DEFAULT 'unverified';

-- doc_path is already nullable; ensure legal_name/country remain required but doc optional
ALTER TABLE public.verification_requests ALTER COLUMN doc_path DROP NOT NULL;

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS trust_level TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS linkedin TEXT;

-- Helper: classify email domain
CREATE OR REPLACE FUNCTION public.is_corporate_email(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _email IS NULL OR _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN FALSE
    WHEN lower(split_part(_email, '@', 2)) = ANY (ARRAY[
      'gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','msn.com',
      'yahoo.com','yahoo.es','yahoo.co.uk','icloud.com','me.com','mac.com',
      'aol.com','proton.me','protonmail.com','pm.me','gmx.com','gmx.es',
      'mail.com','zoho.com','yandex.com','yandex.ru','tutanota.com'
    ]) THEN FALSE
    ELSE TRUE
  END
$$;

-- Compute trust level from company profile + latest verification request
CREATE OR REPLACE FUNCTION public.compute_company_trust_level(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_req RECORD;
  v_has_website BOOLEAN;
  v_has_email BOOLEAN;
  v_corp BOOLEAN;
  v_complete BOOLEAN;
  v_status TEXT;
BEGIN
  SELECT * INTO v_profile FROM public.company_profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN 'unverified'; END IF;

  v_status := COALESCE(v_profile.verification_status, 'unverified');

  -- Admin manual decisions are authoritative
  IF v_status = 'verified' THEN
    -- check if manual override flag via latest request
    SELECT * INTO v_req FROM public.verification_requests
      WHERE user_id = _user_id AND status = 'verified'
      ORDER BY reviewed_at DESC NULLS LAST LIMIT 1;
    IF FOUND AND v_req.reviewed_by IS NOT NULL AND v_req.doc_path IS NOT NULL THEN
      RETURN 'manual';
    END IF;
    -- fall through to compute level based on signals
  ELSIF v_status = 'rejected' THEN
    RETURN 'unverified';
  ELSIF v_status = 'pending' THEN
    -- pending manual review keeps prior auto level if any
    NULL;
  END IF;

  v_complete := public.company_profile_complete(_user_id);
  v_has_email := COALESCE(v_profile.contact_email, '') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  v_has_website := length(COALESCE(v_profile.website, '')) > 0;
  v_corp := public.is_corporate_email(v_profile.contact_email);

  IF (v_corp OR v_has_website) AND v_complete THEN
    RETURN 'trusted';
  ELSIF v_has_email AND v_complete THEN
    RETURN 'basic';
  ELSE
    RETURN 'unverified';
  END IF;
END;
$$;

-- Recompute and persist trust level
CREATE OR REPLACE FUNCTION public.refresh_company_trust_level(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_level TEXT;
BEGIN
  v_level := public.compute_company_trust_level(_user_id);
  UPDATE public.company_profiles SET trust_level = v_level WHERE user_id = _user_id;
  RETURN v_level;
END;
$$;

-- Trigger to keep trust_level in sync when profile changes
CREATE OR REPLACE FUNCTION public.tg_company_profile_trust()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.trust_level := public.compute_company_trust_level(NEW.user_id);
  -- recompute uses stored row; for INSERT/UPDATE compute inline:
  DECLARE
    v_complete BOOLEAN := length(btrim(coalesce(NEW.legal_name,''))) >= 2
      AND length(btrim(coalesce(NEW.country,''))) >= 2
      AND length(btrim(coalesce(NEW.description,''))) >= 20
      AND coalesce(NEW.contact_email,'') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      AND length(coalesce(NEW.logo_url,'')) > 0;
    v_corp BOOLEAN := public.is_corporate_email(NEW.contact_email);
    v_has_website BOOLEAN := length(coalesce(NEW.website,'')) > 0;
    v_has_email BOOLEAN := coalesce(NEW.contact_email,'') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  BEGIN
    IF NEW.verification_status = 'verified' THEN
      -- manual override stays as 'manual' only if a doc-backed admin review exists; otherwise compute
      IF (v_corp OR v_has_website) AND v_complete THEN NEW.trust_level := 'trusted';
      ELSIF v_has_email AND v_complete THEN NEW.trust_level := 'basic';
      ELSE NEW.trust_level := 'basic';
      END IF;
    ELSIF NEW.verification_status = 'rejected' THEN
      NEW.trust_level := 'unverified';
    ELSE
      IF (v_corp OR v_has_website) AND v_complete THEN NEW.trust_level := 'trusted';
      ELSIF v_has_email AND v_complete THEN NEW.trust_level := 'basic';
      ELSE NEW.trust_level := 'unverified';
      END IF;
    END IF;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_profile_trust ON public.company_profiles;
CREATE TRIGGER trg_company_profile_trust
  BEFORE INSERT OR UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_company_profile_trust();

-- Update publish gating: allow publish when trust_level is basic, trusted, or manual
CREATE OR REPLACE FUNCTION public.enforce_profile_complete_before_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trust TEXT;
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
    SELECT trust_level INTO v_trust FROM public.company_profiles WHERE user_id = NEW.company_id;
    IF COALESCE(v_trust,'unverified') NOT IN ('basic','trusted','manual') THEN
      RAISE EXCEPTION 'verification_required' USING HINT = 'Verify your account before publishing';
    END IF;
  END IF;

  RETURN NEW;
END; $function$;

-- Backfill trust_level for existing rows
UPDATE public.company_profiles SET trust_level = public.compute_company_trust_level(user_id);
