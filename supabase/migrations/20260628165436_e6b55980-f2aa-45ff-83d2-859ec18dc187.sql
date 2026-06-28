
CREATE OR REPLACE FUNCTION public.enforce_profile_complete_before_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Data quality checks
  IF length(btrim(coalesce(NEW.title,''))) < 5 OR length(btrim(coalesce(NEW.title,''))) > 120 THEN
    RAISE EXCEPTION 'project_title_invalid' USING HINT = 'Title must be 5-120 characters';
  END IF;
  IF length(btrim(coalesce(NEW.description,''))) < 20 OR length(btrim(coalesce(NEW.description,''))) > 1000 THEN
    RAISE EXCEPTION 'project_description_invalid' USING HINT = 'Description must be 20-1000 characters';
  END IF;
  IF NEW.capital_required IS NULL OR NEW.capital_required <= 0 THEN
    RAISE EXCEPTION 'project_capital_invalid' USING HINT = 'Capital must be greater than 0';
  END IF;

  -- Block publishing if company profile is incomplete (do NOT silently change status).
  IF NEW.status = 'published' AND NOT public.company_profile_complete(NEW.company_id) THEN
    RAISE EXCEPTION 'profile_incomplete' USING HINT = 'Complete your company profile before publishing';
  END IF;

  RETURN NEW;
END; $$;
