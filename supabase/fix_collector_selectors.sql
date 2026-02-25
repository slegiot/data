-- ================================================================
-- Migration: Fix Collector Selectors
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- Fixes 4 collectors with broken/misaligned extraction scripts
-- ================================================================
-- 1. Fix CoinGecko: Table now has 14 columns
--    rank=td[1], name=td[2], price=td[4], 1h=td[5], 24h=td[6], 7d=td[7]
UPDATE collectors
SET css_selector = 'const rows = document.querySelectorAll("table tbody tr");
   const results = [];
   rows.forEach((row, i) => {
     if (i >= 20) return;
     const cells = row.querySelectorAll("td");
     if (cells.length < 8) return;
     const nameText = cells[2]?.innerText?.trim() || "";
     const nameParts = nameText.split("\n");
     results.push({
       rank: cells[1]?.innerText?.trim(),
       name: nameParts[0] || nameText,
       symbol: nameParts[1] || "",
       price: cells[4]?.innerText?.trim(),
       change_1h: cells[5]?.innerText?.trim(),
       change_24h: cells[6]?.innerText?.trim(),
       change_7d: cells[7]?.innerText?.trim(),
       timestamp: new Date().toISOString()
     });
   });
   return results;',
    updated_at = now()
WHERE name = 'CoinGecko Top Crypto';
-- 2. Fix Yahoo Finance: 4 columns (name=td[0], sparkline=td[1], price=td[2], change=td[3])
--    Limit to first table (major indices) to avoid pulling 133 rows
UPDATE collectors
SET css_selector = 'const tables = document.querySelectorAll("table");
   const results = [];
   const seen = new Set();
   tables.forEach((table, tIdx) => {
     if (tIdx >= 3) return;
     const rows = table.querySelectorAll("tbody tr");
     rows.forEach((row) => {
       const cells = row.querySelectorAll("td");
       if (cells.length < 4) return;
       const symbol = cells[0]?.innerText?.trim();
       if (!symbol || seen.has(symbol)) return;
       seen.add(symbol);
       results.push({
         symbol: symbol,
         price: cells[2]?.innerText?.trim(),
         change: cells[3]?.innerText?.trim(),
         timestamp: new Date().toISOString()
       });
     });
   });
   return results;',
    updated_at = now()
WHERE name = 'Yahoo Finance Indices';
-- 3. Fix Reuters: data-testid changed from "Heading" to "TitleLink"
UPDATE collectors
SET css_selector = 'const links = document.querySelectorAll("a[data-testid=TitleLink]");
   const results = [];
   links.forEach((a, i) => {
     if (i >= 15) return;
     results.push({
       headline: a.innerText?.trim(),
       url: a.href,
       timestamp: new Date().toISOString()
     });
   });
   return results;',
    updated_at = now()
WHERE name = 'Reuters Politics';
-- 4. Disable X/Twitter: Anti-bot protection prevents extraction
--    Re-enable once a working extraction method is found
UPDATE collectors
SET is_active = false,
    updated_at = now()
WHERE name = 'X/Twitter Finance';