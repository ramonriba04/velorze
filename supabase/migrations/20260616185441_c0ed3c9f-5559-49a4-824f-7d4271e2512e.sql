
-- Avatar for investor profiles
ALTER TABLE public.investor_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Allow companies (role 'empresa') to view investor profiles for matching/contact.
-- Privacy: still hidden from anon and other roles.
DROP POLICY IF EXISTS investor_profiles_select_by_company ON public.investor_profiles;
CREATE POLICY investor_profiles_select_by_company
  ON public.investor_profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'empresa'::app_role));

-- Project images gallery
CREATE TABLE IF NOT EXISTS public.project_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_images_project_id_idx ON public.project_images(project_id, sort_order);

GRANT SELECT ON public.project_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_images TO authenticated;
GRANT ALL ON public.project_images TO service_role;

ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view images of published projects
CREATE POLICY project_images_select_published
  ON public.project_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_images.project_id
        AND (p.status = 'published'::project_status OR p.company_id = auth.uid())
    )
  );

-- Owners manage their project's images
CREATE POLICY project_images_modify_own
  ON public.project_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_images.project_id AND p.company_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_images.project_id AND p.company_id = auth.uid())
  );

CREATE POLICY project_images_admin_all
  ON public.project_images
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for the project-images bucket
-- Path convention: {user_id}/{kind}/{filename} where kind in ('avatar','logo','project')
DROP POLICY IF EXISTS "project-images read all" ON storage.objects;
CREATE POLICY "project-images read all"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "project-images insert own" ON storage.objects;
CREATE POLICY "project-images insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "project-images update own" ON storage.objects;
CREATE POLICY "project-images update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "project-images delete own" ON storage.objects;
CREATE POLICY "project-images delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
