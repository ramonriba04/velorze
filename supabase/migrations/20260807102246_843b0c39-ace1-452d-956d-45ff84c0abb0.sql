-- 1) Notification preferences ------------------------------------------------
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  emails_enabled BOOLEAN NOT NULL DEFAULT true,
  email_new_match BOOLEAN NOT NULL DEFAULT true,
  email_contact_request BOOLEAN NOT NULL DEFAULT true,
  email_contact_accepted BOOLEAN NOT NULL DEFAULT true,
  email_new_message BOOLEAN NOT NULL DEFAULT true,
  email_project_published BOOLEAN NOT NULL DEFAULT true,
  email_verification_result BOOLEAN NOT NULL DEFAULT true,
  email_project_reported BOOLEAN NOT NULL DEFAULT true,
  email_account_warning BOOLEAN NOT NULL DEFAULT true,
  email_product_updates BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "np_select_own" ON public.notification_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "np_insert_own" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "np_update_own" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "np_delete_own" ON public.notification_preferences
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER notification_preferences_set_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) New in-app notification triggers ----------------------------------------

-- Mutual match -> notify both sides
CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'conectado' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'conectado') THEN
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES
      (NEW.investor_id, 'new_match', jsonb_build_object('connection_id', NEW.id, 'project_id', NEW.project_id, 'other_id', NEW.company_id)),
      (NEW.company_id, 'new_match', jsonb_build_object('connection_id', NEW.id, 'project_id', NEW.project_id, 'other_id', NEW.investor_id));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_match_ins
  AFTER INSERT ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_match();
CREATE TRIGGER trg_notify_match_upd
  AFTER UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_match();

-- Project published -> notify owner
CREATE OR REPLACE FUNCTION public.notify_on_project_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (NEW.company_id, 'project_published', jsonb_build_object('project_id', NEW.id, 'title', NEW.title));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_project_published_ins
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_project_published();
CREATE TRIGGER trg_notify_project_published_upd
  AFTER UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_project_published();

-- Verification reviewed -> notify requester
CREATE OR REPLACE FUNCTION public.notify_on_verification_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (NEW.user_id, 'verification_approved', jsonb_build_object('request_id', NEW.id, 'trust_level', NEW.trust_level));
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (NEW.user_id, 'verification_rejected', jsonb_build_object('request_id', NEW.id, 'reason', NEW.reason));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_verification_review
  AFTER UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_verification_review();

-- Project reported -> notify project owner (no reporter identity disclosed)
CREATE OR REPLACE FUNCTION public.notify_on_project_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner UUID;
BEGIN
  SELECT company_id INTO v_owner FROM public.projects WHERE id = NEW.project_id;
  IF v_owner IS NULL OR v_owner = NEW.reporter_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, payload)
  VALUES (v_owner, 'project_reported', jsonb_build_object('project_id', NEW.project_id));
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_project_report
  AFTER INSERT ON public.project_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_project_report();

-- Account suspended -> account warning notification
CREATE OR REPLACE FUNCTION public.notify_on_account_warning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.suspended_at IS NOT NULL AND OLD.suspended_at IS NULL THEN
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (NEW.id, 'account_warning', jsonb_build_object('suspended_at', NEW.suspended_at));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_account_warning
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_account_warning();