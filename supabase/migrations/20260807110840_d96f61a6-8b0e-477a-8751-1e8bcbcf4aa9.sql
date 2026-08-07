-- 1. Slug helpers
-- lightweight accent folding without the unaccent extension
CREATE OR REPLACE FUNCTION public.unaccent_placeholder(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(
    coalesce(_input, ''),
    'áàäâãåéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC'
  )
$$;

CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    trim(both '-' from
      regexp_replace(
        regexp_replace(
          lower(public.unaccent_placeholder(coalesce(_input, ''))),
          '[^a-z0-9]+', '-', 'g'
        ),
        '-{2,}', '-', 'g'
      )
    ), ''
  )
$$;

-- 2. Columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.company_profiles ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.unique_slug(_table text, _base text, _exclude_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text := coalesce(public.slugify(_base), 'capora');
  v_try  text := v_base;
  v_i    int := 1;
  v_exists boolean;
BEGIN
  LOOP
    IF _table = 'projects' THEN
      SELECT EXISTS (SELECT 1 FROM public.projects WHERE slug = v_try AND (_exclude_id IS NULL OR id::text <> _exclude_id)) INTO v_exists;
    ELSE
      SELECT EXISTS (SELECT 1 FROM public.company_profiles WHERE slug = v_try AND (_exclude_id IS NULL OR user_id::text <> _exclude_id)) INTO v_exists;
    END IF;
    EXIT WHEN NOT v_exists;
    v_i := v_i + 1;
    v_try := v_base || '-' || v_i;
  END LOOP;
  RETURN v_try;
END; $$;
REVOKE EXECUTE ON FUNCTION public.unique_slug(text, text, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.tg_project_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.unique_slug('projects', NEW.title, NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.tg_project_slug() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.tg_company_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.unique_slug('company_profiles', NEW.legal_name, NEW.user_id::text);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.tg_company_slug() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_project_slug ON public.projects;
CREATE TRIGGER trg_project_slug BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_project_slug();

DROP TRIGGER IF EXISTS trg_company_slug ON public.company_profiles;
CREATE TRIGGER trg_company_slug BEFORE INSERT OR UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_company_slug();

-- 3. Backfill
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, title FROM public.projects WHERE slug IS NULL OR slug = '' LOOP
    UPDATE public.projects SET slug = public.unique_slug('projects', r.title, r.id::text) WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT user_id, legal_name FROM public.company_profiles WHERE slug IS NULL OR slug = '' LOOP
    UPDATE public.company_profiles SET slug = public.unique_slug('company_profiles', r.legal_name, r.user_id::text) WHERE user_id = r.user_id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_key ON public.projects (slug);
CREATE UNIQUE INDEX IF NOT EXISTS company_profiles_slug_key ON public.company_profiles (slug);

-- 4. Project views
CREATE TABLE IF NOT EXISTS public.project_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  viewer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.project_views TO anon;
GRANT SELECT, INSERT ON public.project_views TO authenticated;
GRANT ALL ON public.project_views TO service_role;

ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pv_insert_any" ON public.project_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.status = 'published')
    AND (viewer_id IS NULL OR viewer_id = auth.uid())
  );

CREATE POLICY "pv_select_owner" ON public.project_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.company_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX IF NOT EXISTS project_views_project_idx ON public.project_views (project_id, created_at DESC);

-- 5. Owner-only project stats
CREATE OR REPLACE FUNCTION public.project_stats(_project_id uuid)
RETURNS TABLE (
  views bigint,
  favorites bigint,
  requests bigint,
  accepted bigint,
  avg_score numeric,
  last_activity timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT company_id INTO v_owner FROM public.projects WHERE id = _project_id;
  IF v_owner IS NULL THEN RETURN; END IF;
  IF v_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.project_views v WHERE v.project_id = _project_id),
    (SELECT count(*) FROM public.favorites f WHERE f.project_id = _project_id),
    (SELECT count(*) FROM public.contact_requests c WHERE c.project_id = _project_id),
    (SELECT count(*) FROM public.contact_requests c WHERE c.project_id = _project_id AND c.status = 'accepted'),
    (SELECT round(avg(m.score)::numeric, 0) FROM public.match_scores m WHERE m.project_id = _project_id),
    GREATEST(
      (SELECT max(v.created_at) FROM public.project_views v WHERE v.project_id = _project_id),
      (SELECT max(f.created_at) FROM public.favorites f WHERE f.project_id = _project_id),
      (SELECT max(c.created_at) FROM public.contact_requests c WHERE c.project_id = _project_id),
      (SELECT updated_at FROM public.projects WHERE id = _project_id)
    );
END; $$;
REVOKE EXECUTE ON FUNCTION public.project_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.project_stats(uuid) TO authenticated;