
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
CREATE INDEX IF NOT EXISTS messages_conv_read_idx ON public.messages (conversation_id, read_at);

DROP POLICY IF EXISTS "messages_update_recipient" ON public.messages;
CREATE POLICY "messages_update_recipient" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.investor_id = auth.uid() OR c.company_id = auth.uid())
    )
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.investor_id = auth.uid() OR c.company_id = auth.uid())
    )
  );
