
-- 1) BLOCKED USERS -------------------------------------------------
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX blocked_users_blocker_idx ON public.blocked_users (blocker_id);
CREATE INDEX blocked_users_blocked_idx ON public.blocked_users (blocked_id);
GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bu_select_own" ON public.blocked_users FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bu_insert_own" ON public.blocked_users FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "bu_delete_own" ON public.blocked_users FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- 2) USER REPORTS --------------------------------------------------
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_user_id),
  CHECK (char_length(reason) BETWEEN 1 AND 40),
  CHECK (details IS NULL OR char_length(details) <= 1000)
);
CREATE INDEX user_reports_target_idx ON public.user_reports (reported_user_id);
CREATE INDEX user_reports_status_idx ON public.user_reports (status, created_at DESC);
GRANT SELECT, INSERT ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ur_insert_self" ON public.user_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "ur_select" ON public.user_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER user_reports_set_updated_at
  BEFORE UPDATE ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) PROJECT REPORTS ----------------------------------------------
CREATE TABLE public.project_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(reason) BETWEEN 1 AND 40),
  CHECK (details IS NULL OR char_length(details) <= 1000)
);
CREATE INDEX project_reports_project_idx ON public.project_reports (project_id);
CREATE INDEX project_reports_status_idx ON public.project_reports (status, created_at DESC);
GRANT SELECT, INSERT ON public.project_reports TO authenticated;
GRANT ALL ON public.project_reports TO service_role;
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prp_insert_self" ON public.project_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "prp_select" ON public.project_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER project_reports_set_updated_at
  BEFORE UPDATE ON public.project_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) MODERATION AUDIT LOG -----------------------------------------
CREATE TABLE public.moderation_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id),
  target_type TEXT NOT NULL
    CHECK (target_type IN ('user','project','user_report','project_report')),
  target_id UUID NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX moderation_audit_target_idx ON public.moderation_audit (target_type, target_id);
GRANT SELECT ON public.moderation_audit TO authenticated;
GRANT ALL ON public.moderation_audit TO service_role;
ALTER TABLE public.moderation_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ma_admin_read" ON public.moderation_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5) NEW COLUMNS: suspension + moderation hide --------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS hidden_by_moderation BOOLEAN NOT NULL DEFAULT FALSE;

-- 6) HELPER: is_blocked -------------------------------------------
CREATE OR REPLACE FUNCTION public.is_blocked(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) FROM PUBLIC, anon;

-- 7) TRIGGERS: block-aware guards for messages and contact_requests
CREATE OR REPLACE FUNCTION public.enforce_no_block_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE other_id UUID;
BEGIN
  SELECT CASE WHEN c.investor_id = NEW.sender_id THEN c.company_id ELSE c.investor_id END
    INTO other_id
  FROM public.conversations c WHERE c.id = NEW.conversation_id;
  IF other_id IS NULL THEN RETURN NEW; END IF;
  IF public.is_blocked(NEW.sender_id, other_id) THEN
    RAISE EXCEPTION 'blocked_conversation' USING HINT = 'This conversation is blocked';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.enforce_no_block_on_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER messages_block_check
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_no_block_on_message();

CREATE OR REPLACE FUNCTION public.enforce_no_block_on_contact()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_blocked(NEW.investor_id, NEW.company_id) THEN
    RAISE EXCEPTION 'blocked_contact' USING HINT = 'Contact blocked between these users';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.enforce_no_block_on_contact() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contact_requests_block_check
  BEFORE INSERT ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_no_block_on_contact();

-- 8) When A blocks B, drop any pending discovery interest so it can't
--    mature into a mutual match. Existing conversations remain (client hides them).
CREATE OR REPLACE FUNCTION public.on_block_cleanup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.discovery_interactions
    WHERE (user_id = NEW.blocker_id AND target_user_id = NEW.blocked_id)
       OR (user_id = NEW.blocked_id AND target_user_id = NEW.blocker_id);
  UPDATE public.connections
    SET status = 'descartado'
    WHERE (investor_id = NEW.blocker_id AND company_id = NEW.blocked_id)
       OR (investor_id = NEW.blocked_id AND company_id = NEW.blocker_id);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.on_block_cleanup() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER blocked_users_cleanup
  AFTER INSERT ON public.blocked_users
  FOR EACH ROW EXECUTE FUNCTION public.on_block_cleanup();
