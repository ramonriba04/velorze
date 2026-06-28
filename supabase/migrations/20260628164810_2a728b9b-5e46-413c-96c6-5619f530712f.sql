
-- Completeness helpers
CREATE OR REPLACE FUNCTION public.company_profile_complete(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT (
      (CASE WHEN length(btrim(coalesce(cp.legal_name,''))) >= 2 THEN 1 ELSE 0 END) +
      (CASE WHEN length(btrim(coalesce(cp.country,''))) >= 2 THEN 1 ELSE 0 END) +
      (CASE WHEN length(btrim(coalesce(cp.description,''))) >= 20 THEN 1 ELSE 0 END) +
      (CASE WHEN coalesce(cp.contact_email,'') ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN 1 ELSE 0 END) +
      (CASE WHEN length(coalesce(cp.logo_url,'')) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN length(coalesce(cp.website,'')) > 0 THEN 1 ELSE 0 END)
    ) * 100 / 6
    FROM public.company_profiles cp WHERE cp.user_id = _user_id
  ), 0)
$$;

CREATE OR REPLACE FUNCTION public.investor_profile_completeness(_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT (
      (CASE WHEN length(btrim(coalesce(ip.display_name,''))) >= 2 THEN 1 ELSE 0 END) +
      (CASE WHEN array_length(ip.sectors,1) >= 1 THEN 1 ELSE 0 END) +
      (CASE WHEN ip.ticket_min IS NOT NULL AND ip.ticket_max IS NOT NULL AND ip.ticket_max >= ip.ticket_min THEN 1 ELSE 0 END) +
      (CASE WHEN array_length(ip.countries,1) >= 1 THEN 1 ELSE 0 END) +
      (CASE WHEN array_length(ip.investment_types,1) >= 1 THEN 1 ELSE 0 END) +
      (CASE WHEN length(btrim(coalesce(ip.description,''))) >= 20 THEN 1 ELSE 0 END)
    ) * 100 / 6
    FROM public.investor_profiles ip WHERE ip.user_id = _user_id
  ), 0)
$$;

CREATE OR REPLACE FUNCTION public.investor_profile_complete(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.investor_profiles ip
    WHERE ip.user_id = _user_id
      AND length(btrim(coalesce(ip.display_name,''))) >= 2
      AND array_length(ip.sectors,1) >= 1
      AND ip.ticket_min IS NOT NULL AND ip.ticket_max IS NOT NULL
  )
$$;

-- Enforce: only complete company profiles can publish
CREATE OR REPLACE FUNCTION public.enforce_profile_complete_before_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND NOT public.company_profile_complete(NEW.company_id) THEN
    NEW.status := 'draft';
  END IF;
  -- Validate basic data quality
  IF length(btrim(coalesce(NEW.title,''))) < 5 OR length(btrim(coalesce(NEW.title,''))) > 120 THEN
    RAISE EXCEPTION 'project title must be 5-120 characters';
  END IF;
  IF length(btrim(coalesce(NEW.description,''))) < 20 OR length(btrim(coalesce(NEW.description,''))) > 1000 THEN
    RAISE EXCEPTION 'project description must be 20-1000 characters';
  END IF;
  IF NEW.capital_required IS NULL OR NEW.capital_required <= 0 THEN
    RAISE EXCEPTION 'capital_required must be greater than 0';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS projects_enforce_profile_complete ON public.projects;
CREATE TRIGGER projects_enforce_profile_complete
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_complete_before_publish();

GRANT EXECUTE ON FUNCTION public.company_profile_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_profile_completeness(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.investor_profile_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.investor_profile_completeness(uuid) TO authenticated;
