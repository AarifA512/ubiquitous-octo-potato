/* UAE AI News — client-side aggregator
 * Pulls articles from Google News RSS (search feeds) via public CORS proxies,
 * parses them in the browser, and renders cards with links + thumbnails.
 * No build step, no API keys, no server — works on GitHub Pages.
 */

(() => {
  "use strict";

  // Topic presets. Each query is combined with a UAE locator to keep results local.
  const TOPICS = [
    { id: "all", label: "All AI in UAE", query: '("artificial intelligence" OR AI) (UAE OR "United Arab Emirates")' },
    { id: "dubai", label: "Dubai", query: '(AI OR "artificial intelligence") Dubai' },
    { id: "abudhabi", label: "Abu Dhabi", query: '(AI OR "artificial intelligence") "Abu Dhabi"' },
    { id: "g42", label: "G42 & Falcon", query: '(G42 OR Falcon OR "Technology Innovation Institute") UAE AI' },
    { id: "policy", label: "Policy & Strategy", query: '"artificial intelligence" (strategy OR regulation OR ministry) UAE' },
    { id: "startups", label: "Startups & Funding", query: 'AI (startup OR funding OR investment) UAE' },
  ];

  // Public CORS proxies, tried in order until one returns valid XML.
  const PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
  ];

  const els = {
    grid: document.getElementById("grid"),
    status: document.getElementById("status"),
    topics: document.getElementById("topics"),
    search: document.getElementById("search"),
    searchBtn: document.getElementById("searchBtn"),
    refreshBtn: document.getElementById("refreshBtn"),
    updated: document.getElementById("updated"),
  };

  let activeTopic = "all";

  // ---- Feed building & fetching ---------------------------------------------

  function feedUrl(query) {
    const q = encodeURIComponent(query);
    return `https://news.google.com/rss/search?q=${q}&hl=en-AE&gl=AE&ceid=AE:en`;
  }

  async function fetchWithProxies(targetUrl) {
    let lastErr;
    for (const wrap of PROXIES) {
      try {
        const res = await fetch(wrap(targetUrl), { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (text && text.includes("<item>")) return text;
        throw new Error("No items in response");
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("All proxies failed");
  }

  // ---- Parsing --------------------------------------------------------------

  function parseFeed(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) return [];
    return Array.from(doc.querySelectorAll("item")).map((item) => {
      const get = (sel) => item.querySelector(sel)?.textContent?.trim() || "";
      const descHtml = get("description");
      return {
        title: cleanTitle(get("title")),
        link: get("link"),
        pubDate: get("pubDate"),
        source: get("source") || extractSource(get("title")),
        sourceUrl: item.querySelector("source")?.getAttribute("url") || "",
        image: extractImage(item, descHtml),
      };
    });
  }

  function cleanTitle(t) {
    // Google appends " - Source" to titles; trim the trailing source.
    return t.replace(/\s+-\s+[^-]+$/, "").trim() || t;
  }

  function extractSource(title) {
    const m = title.match(/\s+-\s+([^-]+)$/);
    return m ? m[1].trim() : "News";
  }

  function extractImage(item, descHtml) {
    // 1) media:content / media:thumbnail / enclosure
    const media =
      item.getElementsByTagName("media:content")[0] ||
      item.getElementsByTagName("media:thumbnail")[0] ||
      item.querySelector("enclosure");
    const url = media?.getAttribute?.("url");
    if (url) return url;
    // 2) <img> inside the description HTML
    const m = descHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) return m[1];
    return "";
  }

  // ---- Rendering ------------------------------------------------------------

  const PALETTE = [
    ["#1e3a8a", "#0f766e"], ["#7c3aed", "#2563eb"], ["#be123c", "#9333ea"],
    ["#0e7490", "#047857"], ["#b45309", "#be123c"], ["#1d4ed8", "#06b6d4"],
  ];

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i) | 0;
    return Math.abs(h);
  }

  function domainFrom(article) {
    try {
      if (article.sourceUrl) return new URL(article.sourceUrl).hostname;
    } catch (_) {}
    return article.source.replace(/\s+/g, "").toLowerCase() + ".com";
  }

  function timeAgo(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    const diff = (Date.now() - d.getTime()) / 1000;
    const units = [["d", 86400], ["h", 3600], ["m", 60]];
    for (const [label, secs] of units) {
      const v = Math.floor(diff / secs);
      if (v >= 1) return `${v}${label} ago`;
    }
    return "just now";
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function card(article) {
    const a = document.createElement("a");
    a.className = "card";
    a.href = article.link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const domain = domainFrom(article);
    const [g1, g2] = PALETTE[hashCode(article.source) % PALETTE.length];
    const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

    // Thumbnail: real image when available, otherwise a branded fallback tile.
    let thumb;
    if (article.image) {
      thumb = `
        <div class="thumb">
          <img src="${escapeHtml(article.image)}" alt="" loading="lazy"
               onerror="this.closest('.thumb').classList.add('fallback');
                        this.outerHTML='<img class=&quot;fav&quot; src=&quot;${favicon}&quot; alt=&quot;&quot;>'">
          <span class="source-pill">${escapeHtml(article.source)}</span>
        </div>`;
    } else {
      thumb = `
        <div class="thumb fallback" style="--g1:${g1};--g2:${g2}">
          <img class="fav" src="${favicon}" alt="" loading="lazy">
          <span class="source-pill">${escapeHtml(article.source)}</span>
        </div>`;
    }

    a.innerHTML = `
      ${thumb}
      <div class="card-body">
        <h2 class="card-title">${escapeHtml(article.title)}</h2>
        <div class="card-meta">
          <span>${escapeHtml(timeAgo(article.pubDate))}</span>
          <span class="read-more">Read →</span>
        </div>
      </div>`;
    return a;
  }

  function showSkeletons(n = 8) {
    els.grid.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const s = document.createElement("div");
      s.className = "skeleton";
      els.grid.appendChild(s);
    }
  }

  function dedupe(articles) {
    const seen = new Set();
    return articles.filter((a) => {
      const key = a.title.toLowerCase().slice(0, 60);
      if (!a.link || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ---- Orchestration --------------------------------------------------------

  async function load(query) {
    showSkeletons();
    els.status.classList.remove("error");
    els.status.textContent = "Fetching the latest articles…";
    try {
      const xml = await fetchWithProxies(feedUrl(query));
      let articles = dedupe(parseFeed(xml));
      articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

      els.grid.innerHTML = "";
      if (!articles.length) {
        els.grid.innerHTML = `<p class="empty">No articles found. Try a different topic or search term.</p>`;
        els.status.textContent = "No results.";
        return;
      }
      const frag = document.createDocumentFragment();
      articles.forEach((a) => frag.appendChild(card(a)));
      els.grid.appendChild(frag);

      els.status.textContent = `Showing ${articles.length} article${articles.length === 1 ? "" : "s"}.`;
      els.updated.textContent = new Date().toLocaleString("en-AE", {
        dateStyle: "medium", timeStyle: "short",
      });
    } catch (err) {
      els.grid.innerHTML = "";
      els.status.classList.add("error");
      els.status.textContent =
        "Could not load news right now (the public CORS proxies may be busy). Press ↻ Refresh to retry.";
      console.error(err);
    }
  }

  function currentQuery() {
    const custom = els.search.value.trim();
    if (custom) {
      // Keep results UAE-scoped even for custom searches.
      return `${custom} (UAE OR "United Arab Emirates" OR Dubai OR "Abu Dhabi")`;
    }
    return TOPICS.find((t) => t.id === activeTopic).query;
  }

  function buildTopics() {
    TOPICS.forEach((t) => {
      const b = document.createElement("button");
      b.className = "chip" + (t.id === activeTopic ? " active" : "");
      b.textContent = t.label;
      b.addEventListener("click", () => {
        activeTopic = t.id;
        els.search.value = "";
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        b.classList.add("active");
        load(t.query);
      });
      els.topics.appendChild(b);
    });
  }

  function wireControls() {
    els.searchBtn.addEventListener("click", () => load(currentQuery()));
    els.search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") load(currentQuery());
    });
    els.refreshBtn.addEventListener("click", () => load(currentQuery()));
  }

  // ---- Init -----------------------------------------------------------------
  buildTopics();
  wireControls();
  load(currentQuery());
})();
