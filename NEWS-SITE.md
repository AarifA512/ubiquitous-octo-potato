# UAE AI News — Live Aggregator

A self-contained static website that gathers news articles about **Artificial
Intelligence in the United Arab Emirates** and displays each article's headline,
source, link, and thumbnail.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure, search box, topic filters |
| `styles.css` | Dark, responsive card layout |
| `app.js` | Fetches Google News RSS search feeds, parses them in the browser, renders cards |

## How it works

- Pulls from **Google News RSS** search feeds scoped to the UAE (`gl=AE`), so no
  API key is required.
- Because RSS feeds are served without CORS headers, the browser request is
  routed through public CORS proxies (with automatic fallback between several).
- Each article shows its real thumbnail when the feed provides one
  (`media:content`, `enclosure`, or an `<img>` in the description); otherwise it
  falls back to a branded tile built from the source's favicon and name.
- Articles are de-duplicated and sorted newest-first.

## Run it

It's a static site — just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Deploy on GitHub Pages

Enable **Settings → Pages → Deploy from branch**, pick the branch and root
folder, and the site is live with no build step.

## Use

- Click a **topic chip** (Dubai, Abu Dhabi, G42 & Falcon, Policy, Startups…) to
  switch feeds.
- Type a custom term in the search box — results stay scoped to the UAE.
- Press **↻ Refresh** to reload the latest articles.

> Note: live fetching requires outbound internet access to Google News and the
> public CORS proxies. In locked-down/offline environments the page will show a
> "could not load" message; it works normally on any standard connection.
