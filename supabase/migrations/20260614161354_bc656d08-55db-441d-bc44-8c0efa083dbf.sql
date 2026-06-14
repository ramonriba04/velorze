
-- 1) Tighten investor_profiles SELECT
DROP POLICY IF EXISTS "investor_profiles_select_all" ON public.investor_profiles;

CREATE POLICY "investor_profiles_select_own"
ON public.investor_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "investor_profiles_select_admin"
ON public.investor_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "investor_profiles_select_accepted_company"
ON public.investor_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contact_requests cr
    WHERE cr.investor_id = investor_profiles.user_id
      AND cr.company_id = auth.uid()
      AND cr.status = 'accepted'::contact_status
  )
);

-- 2) Add role enforcement to projects DELETE
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_delete_own"
ON public.projects
FOR DELETE
TO authenticated
USING (company_id = auth.uid() AND public.has_role(auth.uid(), 'empresa'::app_role));

-- 3) Restrict storage reads on project-docs to owner folder
DROP POLICY IF EXISTS "project_docs_read_authenticated" ON storage.objects;
CREATE POLICY "project_docs_read_own_folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4) Realtime authorization for messages channel
DROP POLICY IF EXISTS "realtime_messages_read_parties" ON realtime.messages;
CREATE POLICY "realtime_messages_read_parties"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE ('conversation:' || c.id::text) = realtime.topic()
      AND (c.investor_id = auth.uid() OR c.company_id = auth.uid())
  )
);

-- 5) Lock down EXECUTE on database functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_my_role(app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_contact_accepted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
