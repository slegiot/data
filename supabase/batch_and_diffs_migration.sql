-- ================================================================
-- Migration: Batch Operations RPCs + Diff Detection Table
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================================
-- ─── 1. tg_diffs table: tracks per-scrape entity changes ───
CREATE TABLE IF NOT EXISTS tg_diffs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    collector_id uuid REFERENCES collectors(id) ON DELETE CASCADE,
    scrape_id uuid REFERENCES scraped_data(id) ON DELETE CASCADE,
    diff_type text NOT NULL CHECK (
        diff_type IN ('new', 'disappeared', 'changed', 'stable')
    ),
    entity_key text NOT NULL,
    entity_type text NOT NULL DEFAULT 'unknown',
    old_value text,
    new_value text,
    occurrence_delta integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tg_diffs_collector ON tg_diffs(collector_id);
CREATE INDEX IF NOT EXISTS idx_tg_diffs_scrape ON tg_diffs(scrape_id);
CREATE INDEX IF NOT EXISTS idx_tg_diffs_type ON tg_diffs(diff_type);
CREATE INDEX IF NOT EXISTS idx_tg_diffs_created ON tg_diffs(created_at);
-- RLS for tg_diffs
ALTER TABLE tg_diffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin to select tg_diffs" ON tg_diffs FOR
SELECT USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to insert tg_diffs" ON tg_diffs FOR
INSERT WITH CHECK (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to update tg_diffs" ON tg_diffs FOR
UPDATE USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to delete tg_diffs" ON tg_diffs FOR DELETE USING (
    (
        auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
    )
);
-- ─── 2. Batch node upsert RPC ───
-- Accepts a JSON array of entities and upserts them all in one call.
-- Returns the node IDs keyed by entity_key.
CREATE OR REPLACE FUNCTION tg_batch_upsert_nodes(p_collector_id uuid, p_entities jsonb) RETURNS TABLE(
        entity_key text,
        node_id uuid,
        is_new boolean,
        old_occurrence integer
    ) AS $$
DECLARE entity record;
BEGIN FOR entity IN
SELECT *
FROM jsonb_to_recordset(p_entities) AS x(key text, type text, value text) LOOP -- Try to find existing node
    RETURN QUERY WITH existing AS (
        SELECT n.id,
            n.occurrence_count
        FROM tg_nodes n
        WHERE n.collector_id = p_collector_id
            AND n.entity_key = entity.key
        LIMIT 1
    ), upserted AS (
        INSERT INTO tg_nodes (
                collector_id,
                entity_key,
                entity_type,
                entity_value
            )
        VALUES (
                p_collector_id,
                entity.key,
                entity.type,
                entity.value
            ) ON CONFLICT (collector_id, entity_key) DO
        UPDATE
        SET occurrence_count = tg_nodes.occurrence_count + 1,
            last_seen_at = now(),
            entity_value = EXCLUDED.entity_value
        RETURNING id
    )
SELECT entity.key AS entity_key,
    u.id AS node_id,
    (e.id IS NULL) AS is_new,
    COALESCE(e.occurrence_count, 0) AS old_occurrence
FROM upserted u
    LEFT JOIN existing e ON true;
END LOOP;
END;
$$ LANGUAGE plpgsql;
-- ─── 3. Batch edge upsert RPC ───
-- Accepts a JSON array of {source, target} pairs and upserts them all.
CREATE OR REPLACE FUNCTION tg_batch_upsert_edges(p_collector_id uuid, p_edges jsonb) RETURNS integer AS $$
DECLARE edge_record record;
processed integer := 0;
s_id uuid;
t_id uuid;
BEGIN FOR edge_record IN
SELECT *
FROM jsonb_to_recordset(p_edges) AS x(source_id uuid, target_id uuid) LOOP -- Ensure consistent ordering (smaller UUID first)
    IF edge_record.source_id < edge_record.target_id THEN s_id := edge_record.source_id;
t_id := edge_record.target_id;
ELSE s_id := edge_record.target_id;
t_id := edge_record.source_id;
END IF;
INSERT INTO tg_edges (collector_id, source_node_id, target_node_id)
VALUES (p_collector_id, s_id, t_id) ON CONFLICT (collector_id, source_node_id, target_node_id) DO
UPDATE
SET weight = tg_edges.weight + 1,
    last_seen_at = now();
processed := processed + 1;
END LOOP;
RETURN processed;
END;
$$ LANGUAGE plpgsql;
-- ─── 4. Batch diff insert RPC ───
-- Accepts a JSON array of diffs and inserts them all.
CREATE OR REPLACE FUNCTION tg_batch_insert_diffs(
        p_collector_id uuid,
        p_scrape_id uuid,
        p_diffs jsonb
    ) RETURNS integer AS $$
DECLARE diff_record record;
inserted integer := 0;
BEGIN FOR diff_record IN
SELECT *
FROM jsonb_to_recordset(p_diffs) AS x(
        diff_type text,
        entity_key text,
        entity_type text,
        old_value text,
        new_value text,
        occurrence_delta integer
    ) LOOP
INSERT INTO tg_diffs (
        collector_id,
        scrape_id,
        diff_type,
        entity_key,
        entity_type,
        old_value,
        new_value,
        occurrence_delta
    )
VALUES (
        p_collector_id,
        p_scrape_id,
        diff_record.diff_type,
        diff_record.entity_key,
        diff_record.entity_type,
        diff_record.old_value,
        diff_record.new_value,
        COALESCE(diff_record.occurrence_delta, 0)
    );
inserted := inserted + 1;
END LOOP;
RETURN inserted;
END;
$$ LANGUAGE plpgsql;