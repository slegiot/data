-- ================================================================
-- Migration: Temporal Graph Tables
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================================
-- 1. Temporal Graph Nodes — unique entities extracted from scraped data
CREATE TABLE IF NOT EXISTS tg_nodes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    collector_id uuid REFERENCES collectors(id) ON DELETE CASCADE,
    entity_key text NOT NULL,
    entity_type text NOT NULL DEFAULT 'unknown',
    entity_value text,
    occurrence_count integer DEFAULT 1,
    first_seen_at timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}',
    UNIQUE(collector_id, entity_key)
);
-- 2. Temporal Graph Edges — relationships between co-occurring entities
CREATE TABLE IF NOT EXISTS tg_edges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    collector_id uuid REFERENCES collectors(id) ON DELETE CASCADE,
    source_node_id uuid REFERENCES tg_nodes(id) ON DELETE CASCADE,
    target_node_id uuid REFERENCES tg_nodes(id) ON DELETE CASCADE,
    weight integer DEFAULT 1,
    first_seen_at timestamptz DEFAULT now(),
    last_seen_at timestamptz DEFAULT now(),
    UNIQUE(collector_id, source_node_id, target_node_id)
);
-- 3. Temporal Graph Snapshots — periodic aggregate metrics for trends
CREATE TABLE IF NOT EXISTS tg_snapshots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    collector_id uuid REFERENCES collectors(id) ON DELETE CASCADE,
    node_count integer DEFAULT 0,
    edge_count integer DEFAULT 0,
    anomaly_count integer DEFAULT 0,
    avg_occurrence numeric(10, 2) DEFAULT 0,
    created_at timestamptz DEFAULT now()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tg_nodes_collector ON tg_nodes(collector_id);
CREATE INDEX IF NOT EXISTS idx_tg_nodes_last_seen ON tg_nodes(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_tg_nodes_type ON tg_nodes(entity_type);
CREATE INDEX IF NOT EXISTS idx_tg_edges_collector ON tg_edges(collector_id);
CREATE INDEX IF NOT EXISTS idx_tg_edges_source ON tg_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_tg_edges_target ON tg_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_tg_snapshots_collector ON tg_snapshots(collector_id);
CREATE INDEX IF NOT EXISTS idx_tg_snapshots_created ON tg_snapshots(created_at);
-- ================================================================
-- Row Level Security
-- ================================================================
ALTER TABLE tg_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tg_snapshots ENABLE ROW LEVEL SECURITY;
-- Policies for tg_nodes
CREATE POLICY "Allow admin to select tg_nodes" ON tg_nodes FOR
SELECT USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to insert tg_nodes" ON tg_nodes FOR
INSERT WITH CHECK (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to update tg_nodes" ON tg_nodes FOR
UPDATE USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to delete tg_nodes" ON tg_nodes FOR DELETE USING (
    (
        auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
    )
);
-- Policies for tg_edges
CREATE POLICY "Allow admin to select tg_edges" ON tg_edges FOR
SELECT USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to insert tg_edges" ON tg_edges FOR
INSERT WITH CHECK (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to update tg_edges" ON tg_edges FOR
UPDATE USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to delete tg_edges" ON tg_edges FOR DELETE USING (
    (
        auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
    )
);
-- Policies for tg_snapshots
CREATE POLICY "Allow admin to select tg_snapshots" ON tg_snapshots FOR
SELECT USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to insert tg_snapshots" ON tg_snapshots FOR
INSERT WITH CHECK (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to update tg_snapshots" ON tg_snapshots FOR
UPDATE USING (
        (
            auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
        )
    );
CREATE POLICY "Allow admin to delete tg_snapshots" ON tg_snapshots FOR DELETE USING (
    (
        auth.uid() = 'e30bbcd6-3f78-47d1-b335-addfeed3863a'::uuid
    )
);