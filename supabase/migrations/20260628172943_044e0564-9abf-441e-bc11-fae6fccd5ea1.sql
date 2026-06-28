
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'empresa'
    CHECK (entity_type IN ('persona_fisica','startup','empresa','holding','otro'));

-- Completeness: for persona_fisica, logo/website not required; profile image satisfied by logo_url too.
CREATE OR REPLACE FUNCTION public.company_profile_complete(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_profiles cp
    WHERE cp.user_id = _user_id
      AND length(btrim(coalesce(cp.legal_name,''))) >= 2
      AND length(btrim(coalesce(cp.country,''))) >= 2
      AND length(btrim(coalesce(cp.description,''))) >= 20
      AND coalesce(cp.contact_email,'') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      AND length(coalesce(cp.logo_url,'')) > 0
  )
$$;

CREATE OR REPLACE FUNCTION public.company_profile_completeness(_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE WHEN cp.entity_type = 'persona_fisica' THEN (
      (
        (CASE WHEN length(btrim(coalesce(cp.legal_name,''))) >= 2 THEN 1 ELSE 0 END) +
        (CASE WHEN length(btrim(coalesce(cp.country,''))) >= 2 THEN 1 ELSE 0 END) +
        (CASE WHEN length(btrim(coalesce(cp.description,''))) >= 20 THEN 1 ELSE 0 END) +
        (CASE WHEN coalesce(cp.contact_email,'') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN 1 ELSE 0 END) +
        (CASE WHEN length(coalesce(cp.logo_url,'')) > 0 THEN 1 ELSE 0 END)
      ) * 100 / 5
    ) ELSE (
      (
        (CASE WHEN length(btrim(coalesce(cp.legal_name,''))) >= 2 THEN 1 ELSE 0 END) +
        (CASE WHEN length(btrim(coalesce(cp.country,''))) >= 2 THEN 1 ELSE 0 END) +
        (CASE WHEN length(btrim(coalesce(cp.description,''))) >= 20 THEN 1 ELSE 0 END) +
        (CASE WHEN coalesce(cp.contact_email,'') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN 1 ELSE 0 END) +
        (CASE WHEN length(coalesce(cp.logo_url,'')) > 0 THEN 1 ELSE 0 END) +
        (CASE WHEN length(coalesce(cp.website,'')) > 0 THEN 1 ELSE 0 END)
      ) * 100 / 6
    ) END
    FROM public.company_profiles cp WHERE cp.user_id = _user_id
  ), 0)
$$;
