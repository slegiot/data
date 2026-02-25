-- ================================================================
-- Migration: Fix RLS policies + add updated_at column
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================================
-- 1. Drop all existing RLS policies (they have the placeholder UUID)
DROP POLICY IF EXISTS "Allow admin to select collectors" ON collectors;
DROP POLICY IF EXISTS "Allow admin to insert collectors" ON collectors;
DROP POLICY IF EXISTS "Allow admin to update collectors" ON collectors;
DROP POLICY IF EXISTS "Allow admin to delete collectors" ON collectors;
DROP POLICY IF EXISTS "Allow admin to select scraped_data" ON scraped_data;
DROP POLICY IF EXISTS "Allow admin to insert scraped_data" ON scraped_data;
DROP POLICY IF EXISTS "Allow admin to update scraped_data" ON scraped_data;
DROP POLICY IF EXISTS "Allow admin to delete scraped_data" ON scraped_data;
DROP POLICY IF EXISTS "Allow admin to select logs" ON logs;
DROP POLICY IF EXISTS "Allow admin to insert logs" ON logs;
DROP POLICY IF EXISTS "Allow admin to update logs" ON logs;
DROP POLICY IF EXISTS "Allow admin to delete logs" ON logs;
-- 2. Recreate policies with your actual UUID
CREATE POLICY "Allow admin to select collectors" ON collectors FOR
SELECT USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to insert collectors" ON collectors FOR
INSERT WITH CHECK (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to update collectors" ON collectors FOR
UPDATE USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to delete collectors" ON collectors FOR DELETE USING (
    (
        auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
    )
);
CREATE POLICY "Allow admin to select scraped_data" ON scraped_data FOR
SELECT USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to insert scraped_data" ON scraped_data FOR
INSERT WITH CHECK (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to update scraped_data" ON scraped_data FOR
UPDATE USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to delete scraped_data" ON scraped_data FOR DELETE USING (
    (
        auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
    )
);
CREATE POLICY "Allow admin to select logs" ON logs FOR
SELECT USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to insert logs" ON logs FOR
INSERT WITH CHECK (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to update logs" ON logs FOR
UPDATE USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to delete logs" ON logs FOR DELETE USING (
    (
        auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
    )
);
-- 3. Add updated_at column to collectors (won't error if it already exists)
ALTER TABLE collectors
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
-- 4. Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_collectors_updated_at ON collectors;
CREATE TRIGGER set_collectors_updated_at BEFORE
UPDATE ON collectors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();