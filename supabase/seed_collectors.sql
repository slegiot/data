-- =======================================================================
-- Silent Data Collector — Collector Seed Data
-- Run this SQL against your Supabase project to populate all collectors.
-- =======================================================================
-- 1. CoinGecko: Top 20 Crypto Prices
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
        'CoinGecko Top Crypto',
        'https://www.coingecko.com/',
        'const rows = document.querySelectorAll("table tbody tr");
   const results = [];
   rows.forEach((row, i) => {
     if (i >= 20) return;
     const cells = row.querySelectorAll("td");
     if (cells.length < 5) return;
     results.push({
       rank: cells[0]?.innerText?.trim(),
       name: cells[1]?.innerText?.trim(),
       price: cells[2]?.innerText?.trim(),
       change_1h: cells[3]?.innerText?.trim(),
       change_24h: cells[4]?.innerText?.trim(),
       change_7d: cells[5]?.innerText?.trim(),
       timestamp: new Date().toISOString()
     });
   });
   return results;',
        true
    );
-- 2. Yahoo Finance: Major Stock Indices
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
        'Yahoo Finance Indices',
        'https://finance.yahoo.com/markets/',
        'const rows = document.querySelectorAll("table tbody tr");
   const results = [];
   rows.forEach((row) => {
     const cells = row.querySelectorAll("td");
     if (cells.length < 4) return;
     results.push({
       symbol: cells[0]?.innerText?.trim(),
       name: cells[1]?.innerText?.trim(),
       price: cells[2]?.innerText?.trim(),
       change: cells[3]?.innerText?.trim(),
       change_pct: cells[4]?.innerText?.trim(),
       timestamp: new Date().toISOString()
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
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
        'Reuters Politics',
        'https://www.reuters.com/world/',
        'const links = document.querySelectorAll("a[data-testid=Heading]");
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
-- 10. X/Twitter: Trending Finance & Crypto Topics
-- Note: X.com has aggressive anti-bot protections. This collector targets the
-- Explore/Trending page. You may need to use a logged-in Browserless session
-- or switch to Nitter (a Twitter frontend mirror) if blocked.
INSERT INTO collectors (name, target_url, css_selector, is_active)
VALUES (
        'X/Twitter Trending',
        'https://nitter.net/search?q=stocks+OR+crypto+OR+bitcoin+OR+market&f=tweets',
        'const tweets = document.querySelectorAll(".timeline-item");
   const results = [];
   tweets.forEach((tweet, i) => {
     if (i >= 20) return;
     const author = tweet.querySelector(".username")?.innerText?.trim();
     const content = tweet.querySelector(".tweet-content")?.innerText?.trim();
     const date = tweet.querySelector(".tweet-date a")?.getAttribute("title");
     const stats = tweet.querySelector(".tweet-stat")?.innerText?.trim();
     if (content) {
       results.push({
         author: author || "unknown",
         content,
         date: date || new Date().toISOString(),
         stats: stats || null,
         timestamp: new Date().toISOString()
       });
     }
   });
   return results;',
        true
    );