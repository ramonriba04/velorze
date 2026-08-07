CREATE OR REPLACE FUNCTION public.blocked_with_me(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT blocked_id FROM public.blocked_users WHERE blocker_id = _user_id
  UNION
  SELECT blocker_id FROM public.blocked_users WHERE blocked_id = _user_id
$$;

REVOKE ALL ON FUNCTION public.blocked_with_me(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.blocked_with_me(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.blocked_with_me(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.blocked_with_me(uuid) TO service_role;