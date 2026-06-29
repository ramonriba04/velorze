
-- Discovery interactions: who showed interest in whom (and which project)
CREATE TABLE IF NOT EXISTS public.discovery_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('interested','skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_di_user ON public.discovery_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_di_target ON public.discovery_interactions(target_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discovery_interactions TO authenticated;
GRANT ALL ON public.discovery_interactions TO service_role;

ALTER TABLE public.discovery_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY di_select_own ON public.discovery_interactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY di_insert_own ON public.discovery_interactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND user_id <> target_user_id);

CREATE POLICY di_update_own ON public.discovery_interactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY di_delete_own ON public.discovery_interactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Connections: tracks mutual interest pairs
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL,
  company_id UUID NOT NULL,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','conectado','descartado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investor_id, company_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY conn_select_parties ON public.connections
  FOR SELECT TO authenticated
  USING (auth.uid() = investor_id OR auth.uid() = company_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY conn_insert_party ON public.connections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = investor_id OR auth.uid() = company_id);

CREATE POLICY conn_update_party ON public.connections
  FOR UPDATE TO authenticated
  USING (auth.uid() = investor_id OR auth.uid() = company_id)
  WITH CHECK (auth.uid() = investor_id OR auth.uid() = company_id);

CREATE TRIGGER trg_connections_updated_at BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Daily interest count helper
CREATE OR REPLACE FUNCTION public.discovery_today_interest_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.discovery_interactions
  WHERE user_id = _user_id
    AND decision = 'interested'
    AND created_at >= date_trunc('day', now());
$$;
