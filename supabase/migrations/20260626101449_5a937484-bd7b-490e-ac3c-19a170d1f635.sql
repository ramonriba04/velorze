
-- 1. Drop overly broad investor_profiles SELECT policy
DROP POLICY IF EXISTS "investor_profiles_select_by_company" ON public.investor_profiles;

-- 2. Tighten contact_requests UPDATE policy: require empresa role and prevent role/path-bypass
DROP POLICY IF EXISTS "cr_update_company" ON public.contact_requests;
CREATE POLICY "cr_update_company" ON public.contact_requests
FOR UPDATE TO authenticated
USING (auth.uid() = company_id AND public.has_role(auth.uid(), 'empresa'::app_role))
WITH CHECK (auth.uid() = company_id AND public.has_role(auth.uid(), 'empresa'::app_role));

-- 3. Tighten projects UPDATE policy: require empresa role
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
CREATE POLICY "projects_update_own" ON public.projects
FOR UPDATE TO authenticated
USING (auth.uid() = company_id AND public.has_role(auth.uid(), 'empresa'::app_role))
WITH CHECK (auth.uid() = company_id AND public.has_role(auth.uid(), 'empresa'::app_role));
