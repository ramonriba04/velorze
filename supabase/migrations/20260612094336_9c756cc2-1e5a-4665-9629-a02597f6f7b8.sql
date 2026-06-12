
-- Lock down SECURITY DEFINER fns: revoke public execute, grant only to needed roles
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.assign_my_role(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_my_role(public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_contact_accepted() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;

-- Set search_path on set_updated_at (was missing)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Storage policies: investors and the owner company can read; owner company can write
CREATE POLICY "project_docs_owner_all" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'project-docs' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'project-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "project_docs_read_authenticated" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-docs');
