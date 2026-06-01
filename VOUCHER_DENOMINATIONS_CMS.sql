-- VOUCHER DENOMINATIONS CMS SETUP SCRIPT
-- Please run this script in your Supabase SQL Editor or execute it directly

-- 1. Create public.voucher_denominations table
CREATE TABLE IF NOT EXISTS public.voucher_denominations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  show_on_landing BOOLEAN DEFAULT true NOT NULL,
  show_in_dropdown BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.voucher_denominations ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for public.voucher_denominations
DROP POLICY IF EXISTS "Allow public read access for voucher_denominations" ON public.voucher_denominations;
CREATE POLICY "Allow public read access for voucher_denominations"
ON public.voucher_denominations FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow admin to manage voucher_denominations" ON public.voucher_denominations;
CREATE POLICY "Allow admin to manage voucher_denominations"
ON public.voucher_denominations FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Seed database with standard values
INSERT INTO public.voucher_denominations (amount, label, description, show_on_landing, show_in_dropdown, sort_order)
VALUES 
  (500, '$500', NULL, true, false, 10),
  (1000, '$1,000', NULL, true, false, 20),
  (2000, '$2,000', NULL, true, false, 30),
  (3000, '$3,000', NULL, true, false, 40),
  (0, 'Custom', NULL, true, false, 45),
  (300, '$300 (Amazon Classroom Supplies Support)', 'This voucher provides controlled purchasing access through the GBFF Amazon Business nonprofit account for approved educational supplies and classroom resources via vetted GBFF partners. The total value is capped at $300, including taxes, shipping, and fees. Funding is based on educational need, review, and availability, and may be partially or fully awarded. Submission does not guarantee approval. One application is allowed per program cycle/year unless otherwise invited. Approved vouchers are non-transferable, have no cash value, and must be used only for approved educational purposes within the $300 limit.', false, true, 50),
  (1000, '$1000 Individual Academic/Development Support', NULL, false, true, 60),
  (5000, '$5000 School Academic Support Grant', NULL, false, true, 70),
  (10000, '$10000 School Education Expansion Grant', NULL, false, true, 80)
ON CONFLICT DO NOTHING;
