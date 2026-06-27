
-- 1) Restrict contact_email column on company_profiles
REVOKE SELECT ON public.company_profiles FROM authenticated, anon;
GRANT SELECT (user_id, legal_name, country, description, logo_url, website, created_at, updated_at) ON public.company_profiles TO authenticated;

-- Secure accessor for contact_email
CREATE OR REPLACE FUNCTION public.get_company_contact_email(_company_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.contact_email
  FROM public.company_profiles cp
  WHERE cp.user_id = _company_id
    AND (
      auth.uid() = cp.user_id
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.contact_requests cr
        WHERE cr.company_id = cp.user_id
          AND cr.investor_id = auth.uid()
          AND cr.status = 'accepted'
      )
    )
$$;

GRANT EXECUTE ON FUNCTION public.get_company_contact_email(uuid) TO authenticated;

-- 2) Tighten projects_select_own to require empresa role
DROP POLICY IF EXISTS projects_select_own ON public.projects;
CREATE POLICY projects_select_own ON public.projects
  FOR SELECT
  TO authenticated
  USING (company_id = auth.uid() AND public.has_role(auth.uid(), 'empresa'::app_role));
