DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN SELECT c.relname AS table_name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
  END LOOP;
END $$;

-- Public read tables (projects listing, plans, profiles for display, project images)
GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.project_images TO anon;
GRANT SELECT ON public.subscription_plans TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.company_profiles TO anon;
GRANT SELECT ON public.investor_profiles TO anon;
GRANT SELECT ON public.feature_flags TO anon;