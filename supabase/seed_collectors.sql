-- =======================================================================
-- Silent Data Collector — Collector Seed Data
-- Run this SQL against your Supabase project to populate all collectors.
-- =======================================================================
-- 1. CoinGecko: Top 20 Crypto Prices
-- Table has 14 columns: star=td[0], rank=td[1], name=td[2], buy=td[3], price=td[4], 1h=td[5], 24h=td[6], 7d=td[7]
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
    'CoinGecko Top Crypto',
    'https://www.coingecko.com/',
    'const rows = document.querySelectorAll("table tbody tr");
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
    true
  );
-- 2. Yahoo Finance: Major Stock Indices
-- 4 columns: symbol=td[0], sparkline=td[1], price=td[2], change=td[3]
-- Limit to first 3 tables (Americas, Europe, Asia) to avoid 133+ rows
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
    'Yahoo Finance Indices',
    'https://finance.yahoo.com/markets/',
    'const tables = document.querySelectorAll("table");
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
    true
  );
-- 3. Crypto Fear & Greed Index
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
    'Crypto Fear & Greed',
    'https://alternative.me/crypto/fear-and-greed-index/',
    'const el = document.querySelector(".fng-circle");
   const value = el ? el.innerText.trim() : null;
   const label = document.querySelector(".status")?.innerText?.trim();
   return {
     score: value,
     label: label || "Unknown",
     timestamp: new Date().toISOString()
   };',
    true
  );
-- 4. Reuters World/Politics Headlines
-- data-testid changed from "Heading" to "TitleLink"
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
    'Reuters Politics',
    'https://www.reuters.com/world/',
    'const links = document.querySelectorAll("a[data-testid=TitleLink]");
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
    true
  );
-- 5. AP News Politics Headlines
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
    'AP News Politics',
    'https://apnews.com/politics',
    'const items = document.querySelectorAll("a.Link");
   const results = [];
   const seen = new Set();
   items.forEach((a) => {
     const text = a.innerText?.trim();
     if (text && text.length > 30 && !seen.has(text) && results.length < 15) {
       seen.add(text);
       results.push({
         headline: text,
         url: a.href,
         timestamp: new Date().toISOString()
       });
     }
   });
   return results;',
    true
  );
-- 6. BBC World News Headlines
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
    'BBC World News',
    'https://www.bbc.com/news/world',
    'const items = document.querySelectorAll("h2[data-testid=card-headline]");
   const results = [];
   items.forEach((el, i) => {
     if (i >= 15) return;
     const link = el.closest("a");
     results.push({
       headline: el.innerText?.trim(),
       url: link ? link.href : null,
       timestamp: new Date().toISOString()
     });
   });
   return results;',
    true
  );
-- 7. Reddit: r/wallstreetbets Top Posts
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
    'r/wallstreetbets',
    'https://old.reddit.com/r/wallstreetbets/hot/',
    'const posts = document.querySelectorAll("#siteTable .thing.link");
   const results = [];
   posts.forEach((post, i) => {
     if (i >= 20) return;
     const title = post.querySelector("a.title")?.innerText?.trim();
     const score = post.querySelector(".score.unvoted")?.innerText?.trim();
     const comments = post.querySelector(".comments")?.innerText?.trim();
     const flair = post.querySelector(".linkflairlabel")?.innerText?.trim();
     if (title) {
       results.push({
         title,
         score: score || "0",
         comments: comments || "0 comments",
         flair: flair || null,
         timestamp: new Date().toISOString()
       });
     }
   });
   return results;',
    true
  );
-- 8. Reddit: r/cryptocurrency Top Posts
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
    'r/cryptocurrency',
    'https://old.reddit.com/r/CryptoCurrency/hot/',
    'const posts = document.querySelectorAll("#siteTable .thing.link");
   const results = [];
   posts.forEach((post, i) => {
     if (i >= 20) return;
     const title = post.querySelector("a.title")?.innerText?.trim();
     const score = post.querySelector(".score.unvoted")?.innerText?.trim();
     const comments = post.querySelector(".comments")?.innerText?.trim();
     const flair = post.querySelector(".linkflairlabel")?.innerText?.trim();
     if (title) {
       results.push({
         title,
         score: score || "0",
         comments: comments || "0 comments",
         flair: flair || null,
         timestamp: new Date().toISOString()
       });
     }
   });
   return results;',
    true
  );
-- 9. Reddit: r/politics Top Posts
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
    'r/politics',
    'https://old.reddit.com/r/politics/hot/',
    'const posts = document.querySelectorAll("#siteTable .thing.link");
   const results = [];
   posts.forEach((post, i) => {
     if (i >= 20) return;
     const title = post.querySelector("a.title")?.innerText?.trim();
     const score = post.querySelector(".score.unvoted")?.innerText?.trim();
     const comments = post.querySelector(".comments")?.innerText?.trim();
     if (title) {
       results.push({
         title,
         score: score || "0",
         comments: comments || "0 comments",
         timestamp: new Date().toISOString()
       });
     }
   });
   return results;',
    true
  );
-- 10. X/Twitter: Finance & Crypto Search
-- DISABLED: Anti-bot protection blocks Playwright extraction consistently
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
    'X/Twitter Finance',
    'https://x.com/search?q=stocks+OR+crypto+OR+bitcoin+OR+market+crash+OR+fed+rate&f=live',
    'const articles = document.querySelectorAll("article[data-testid=tweet]");
   const results = [];
   articles.forEach((tweet, i) => {
     if (i >= 20) return;
     const userEl = tweet.querySelector("div[data-testid=User-Name]");
     const author = userEl ? userEl.innerText.split("\n")[0] : "unknown";
     const handle = userEl ? (userEl.innerText.match(/@\w+/) || [""])[0] : "";
     const content = tweet.querySelector("div[data-testid=tweetText]")?.innerText?.trim();
     const time = tweet.querySelector("time")?.getAttribute("datetime");
     const likes = tweet.querySelector("div[data-testid=like] span")?.innerText?.trim();
     const retweets = tweet.querySelector("div[data-testid=retweet] span")?.innerText?.trim();
     const replies = tweet.querySelector("div[data-testid=reply] span")?.innerText?.trim();
     if (content) {
       results.push({
         author,
         handle,
         content,
         posted_at: time || new Date().toISOString(),
         likes: likes || "0",
         retweets: retweets || "0",
         replies: replies || "0",
         timestamp: new Date().toISOString()
       });
     }
   });
   return results;',
    false
  );