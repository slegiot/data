-- Create tables
CREATE TABLE collectors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    target_url text NOT NULL,
    css_selector text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);
CREATE TABLE scraped_data (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    collector_id uuid REFERENCES collectors(id) ON DELETE CASCADE,
    extracted_data jsonb,
    created_at timestamptz DEFAULT now()
);
CREATE TABLE logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    collector_id uuid REFERENCES collectors(id) ON DELETE CASCADE,
    status text CHECK (status IN ('success', 'error')),
    message text,
    created_at timestamptz DEFAULT now()
);
-- Note: In Supabase, the uuid for the user will be checked against the auth.uid() function.
-- The user specified to use exactly this SQL condition: (auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid)
-- Enable RLS
ALTER TABLE collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
-- Policies for collectors
CREATE POLICY "Allow admin to select collectors" ON collectors FOR
SELECT USING ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
CREATE POLICY "Allow admin to insert collectors" ON collectors FOR
INSERT WITH CHECK ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
CREATE POLICY "Allow admin to update collectors" ON collectors FOR
UPDATE USING ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
CREATE POLICY "Allow admin to delete collectors" ON collectors FOR DELETE USING ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
-- Policies for scraped_data
CREATE POLICY "Allow admin to select scraped_data" ON scraped_data FOR
SELECT USING ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
CREATE POLICY "Allow admin to insert scraped_data" ON scraped_data FOR
INSERT WITH CHECK ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
CREATE POLICY "Allow admin to update scraped_data" ON scraped_data FOR
UPDATE USING ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
CREATE POLICY "Allow admin to delete scraped_data" ON scraped_data FOR DELETE USING ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
-- Policies for logs
CREATE POLICY "Allow admin to select logs" ON logs FOR
SELECT USING ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
CREATE POLICY "Allow admin to insert logs" ON logs FOR
INSERT WITH CHECK ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
CREATE POLICY "Allow admin to update logs" ON logs FOR
UPDATE USING ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));
CREATE POLICY "Allow admin to delete logs" ON logs FOR DELETE USING ((auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid));