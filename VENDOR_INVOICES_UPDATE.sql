-- VENDOR INVOICES SETUP SCRIPT
-- Please run this script in your Supabase SQL Editor to support the new vendor invoice upload feature

-- 1. Add invoice_url column to vendor_voucher_submissions table
ALTER TABLE vendor_voucher_submissions ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- 2. Create the vendor-invoices storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vendor-invoices', 'vendor-invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Set up Storage Security Policies for vendor-invoices bucket

-- Allow vendors to upload files
CREATE POLICY "Vendors can upload invoices" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'vendor-invoices' );

-- Allow anyone to view invoices (or you can restrict to authenticated users)
CREATE POLICY "Anyone can view invoices" 
ON storage.objects FOR SELECT 
TO public 
USING ( bucket_id = 'vendor-invoices' );

-- Allow vendors to update their own invoices
CREATE POLICY "Vendors can update their invoices" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING ( bucket_id = 'vendor-invoices' );

-- Allow vendors to delete their own invoices
CREATE POLICY "Vendors can delete their invoices" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( bucket_id = 'vendor-invoices' );
