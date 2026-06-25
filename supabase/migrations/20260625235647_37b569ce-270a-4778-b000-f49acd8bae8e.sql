-- 1. Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id) WHERE read_at IS NULL;

-- 2. Grants
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- 3. RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Policies (users only see/modify their own; inserts happen via SECURITY DEFINER triggers)
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5. Triggers
CREATE OR REPLACE FUNCTION public.notify_on_contact_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- New request -> notify the company
  INSERT INTO public.notifications (user_id, type, payload)
  VALUES (
    NEW.company_id,
    'contact_request_received',
    jsonb_build_object(
      'request_id', NEW.id,
      'project_id', NEW.project_id,
      'investor_id', NEW.investor_id
    )
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_contact_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (
      NEW.investor_id,
      'contact_request_accepted',
      jsonb_build_object(
        'request_id', NEW.id,
        'project_id', NEW.project_id,
        'company_id', NEW.company_id
      )
    );
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (
      NEW.investor_id,
      'contact_request_rejected',
      jsonb_build_object(
        'request_id', NEW.id,
        'project_id', NEW.project_id,
        'company_id', NEW.company_id
      )
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient UUID;
  conv RECORD;
BEGIN
  SELECT investor_id, company_id INTO conv
    FROM public.conversations WHERE id = NEW.conversation_id;
  IF conv.investor_id = NEW.sender_id THEN
    recipient := conv.company_id;
  ELSE
    recipient := conv.investor_id;
  END IF;
  IF recipient IS NULL OR recipient = NEW.sender_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, type, payload)
  VALUES (
    recipient,
    'message_received',
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id
    )
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_contact_request ON public.contact_requests;
CREATE TRIGGER trg_notify_contact_request
  AFTER INSERT ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_contact_request();

DROP TRIGGER IF EXISTS trg_notify_contact_status ON public.contact_requests;
CREATE TRIGGER trg_notify_contact_status
  AFTER UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_contact_status();

DROP TRIGGER IF EXISTS trg_notify_message ON public.messages;
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();