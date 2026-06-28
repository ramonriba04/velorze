
-- Extend business_stage enum
ALTER TYPE public.business_stage ADD VALUE IF NOT EXISTS 'mvp';
ALTER TYPE public.business_stage ADD VALUE IF NOT EXISTS 'early_revenue';
ALTER TYPE public.business_stage ADD VALUE IF NOT EXISTS 'growth';
ALTER TYPE public.business_stage ADD VALUE IF NOT EXISTS 'mature';

-- Extend investment_type enum
ALTER TYPE public.investment_type ADD VALUE IF NOT EXISTS 'debt';
ALTER TYPE public.investment_type ADD VALUE IF NOT EXISTS 'revenue_share';
ALTER TYPE public.investment_type ADD VALUE IF NOT EXISTS 'crowdfunding';
ALTER TYPE public.investment_type ADD VALUE IF NOT EXISTS 'angel';
ALTER TYPE public.investment_type ADD VALUE IF NOT EXISTS 'venture';
ALTER TYPE public.investment_type ADD VALUE IF NOT EXISTS 'private_equity';
ALTER TYPE public.investment_type ADD VALUE IF NOT EXISTS 'strategic';

-- Company type (free text, predefined options in UI, allows custom "other")
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS company_type TEXT;
