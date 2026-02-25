-- ================================================================
-- Migration: Community Detection + Realtime Support
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================================
-- 1. Add community_id to tg_nodes for cluster assignment
ALTER TABLE tg_nodes
ADD COLUMN IF NOT EXISTS community_id integer DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_tg_nodes_community ON tg_nodes(community_id);
-- 2. RPC: Label Propagation Community Detection
-- Runs iteratively — each node adopts the most common community among its neighbours.
-- Converges in ~5-10 iterations for typical graph sizes.
CREATE OR REPLACE FUNCTION tg_detect_communities(
        p_collector_id uuid DEFAULT NULL,
        p_max_iterations integer DEFAULT 10
    ) RETURNS TABLE(community_id integer, member_count bigint) AS $$
DECLARE iteration integer := 0;
changed integer := 1;
BEGIN -- Step 1: Initialise each node with its own unique community
IF p_collector_id IS NOT NULL THEN
UPDATE tg_nodes
SET community_id = (
        ROW_NUMBER() OVER (
            ORDER BY id
        )
    )::integer
WHERE collector_id = p_collector_id;
ELSE
UPDATE tg_nodes
SET community_id = (
        ROW_NUMBER() OVER (
            ORDER BY id
        )
    )::integer;
END IF;
-- Step 2: Iterate label propagation
WHILE iteration < p_max_iterations
AND changed > 0 LOOP changed := 0;
-- For each node, find the most common community among its neighbours
WITH neighbour_communities AS (
    SELECT n.id AS node_id,
        COALESCE(
            (
                SELECT n2.community_id
                FROM tg_edges e
                    JOIN tg_nodes n2 ON (
                        CASE
                            WHEN e.source_node_id = n.id THEN e.target_node_id
                            ELSE e.source_node_id
                        END
                    ) = n2.id
                WHERE (
                        e.source_node_id = n.id
                        OR e.target_node_id = n.id
                    )
                    AND (
                        p_collector_id IS NULL
                        OR e.collector_id = p_collector_id
                    )
                GROUP BY n2.community_id
                ORDER BY SUM(e.weight) DESC,
                    n2.community_id
                LIMIT 1
            ), n.community_id
        ) AS best_community
    FROM tg_nodes n
    WHERE p_collector_id IS NULL
        OR n.collector_id = p_collector_id
)
UPDATE tg_nodes
SET community_id = nc.best_community
FROM neighbour_communities nc
WHERE tg_nodes.id = nc.node_id
    AND tg_nodes.community_id != nc.best_community;
GET DIAGNOSTICS changed = ROW_COUNT;
iteration := iteration + 1;
END LOOP;
-- Step 3: Renumber communities to be contiguous (0, 1, 2, ...)
WITH ranked AS (
    SELECT DISTINCT community_id AS old_id,
        DENSE_RANK() OVER (
            ORDER BY community_id
        ) - 1 AS new_id
    FROM tg_nodes
    WHERE p_collector_id IS NULL
        OR collector_id = p_collector_id
)
UPDATE tg_nodes
SET community_id = ranked.new_id::integer
FROM ranked
WHERE tg_nodes.community_id = ranked.old_id
    AND (
        p_collector_id IS NULL
        OR tg_nodes.collector_id = p_collector_id
    );
-- Return community summary
RETURN QUERY
SELECT tg_nodes.community_id,
    COUNT(*) AS member_count
FROM tg_nodes
WHERE p_collector_id IS NULL
    OR collector_id = p_collector_id
GROUP BY tg_nodes.community_id
ORDER BY member_count DESC;
END;
$$ LANGUAGE plpgsql;
-- 3. Enable Realtime on temporal graph tables
-- This allows the frontend to subscribe to INSERT/UPDATE events
ALTER PUBLICATION supabase_realtime
ADD TABLE tg_nodes;
ALTER PUBLICATION supabase_realtime
ADD TABLE tg_edges;
ALTER PUBLICATION supabase_realtime
ADD TABLE tg_diffs;
ALTER PUBLICATION supabase_realtime
ADD TABLE tg_snapshots;