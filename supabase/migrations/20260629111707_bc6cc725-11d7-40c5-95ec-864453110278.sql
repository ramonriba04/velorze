
DROP POLICY IF EXISTS cr_insert_investor ON public.contact_requests;
DROP POLICY IF EXISTS cr_update_company ON public.contact_requests;
DROP POLICY IF EXISTS cr_select_parties ON public.contact_requests;

CREATE POLICY cr_insert_sender ON public.contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (investor_id = auth.uid() AND company_id <> auth.uid());

CREATE POLICY cr_select_parties ON public.contact_requests
  FOR SELECT TO authenticated
  USING (investor_id = auth.uid() OR company_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY cr_update_company ON public.contact_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = company_id)
  WITH CHECK (auth.uid() = company_id);
