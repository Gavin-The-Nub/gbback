-- PROGRAM REACH & FIELD IMPACT CMS SETUP SCRIPT
-- Please run this script in your Supabase SQL Editor or execute it directly

-- 1. Create public.impact_images table
CREATE TABLE IF NOT EXISTS public.impact_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.impact_images ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for public.impact_images
DROP POLICY IF EXISTS "Allow public read access for impact_images" ON public.impact_images;
CREATE POLICY "Allow public read access for impact_images"
ON public.impact_images FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow admin to manage impact_images" ON public.impact_images;
CREATE POLICY "Allow admin to manage impact_images"
ON public.impact_images FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Create storage bucket for impact-images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('impact-images', 'impact-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. RLS policies for storage.objects (bucket id 'impact-images')
DROP POLICY IF EXISTS "Anyone can view impact images" ON storage.objects;
CREATE POLICY "Anyone can view impact images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'impact-images');

DROP POLICY IF EXISTS "Admins can upload impact images" ON storage.objects;
CREATE POLICY "Admins can upload impact images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'impact-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update impact images" ON storage.objects;
CREATE POLICY "Admins can update impact images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'impact-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete impact images" ON storage.objects;
CREATE POLICY "Admins can delete impact images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'impact-images' AND public.is_admin());
