
-- Convert plan helpers to SECURITY INVOKER and revoke anon access
CREATE OR REPLACE FUNCTION public.get_my_plan_code()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan_code FROM public.user_plan WHERE user_id = auth.uid()),
    'free'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_plan_limit(_code TEXT, _key TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT NULLIF(limits->>_key, '')::INTEGER
  FROM public.subscription_plans
  WHERE code = _code
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_plan_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_plan_limit(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_plan_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plan_limit(TEXT, TEXT) TO authenticated;
