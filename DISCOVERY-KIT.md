# Zero — Discovery Kit
**Purpose:** the engine that gets Zero found. Arc loads the copy; Milton spends ~15 min on the logins only he can do.
**Live hub:** https://thefinalmilkman.github.io/zero/ · **Flagship:** https://thefinalmilkman.github.io/metastrip/

---

## Paste-ready copy (use these verbatim — no rewriting needed)

**Name:** Zero
**Tagline (≤60):** Free privacy tools that run in your browser — nothing uploaded
**One-liner:** Free, open-source privacy tools that run entirely in your browser. Strip photo metadata, scrub screenshots, compress images, generate passwords — nothing is ever uploaded.
**Short (≤160):** Free, open-source privacy tools that run 100% in your browser. Remove photo GPS/EXIF, scrub screenshots, compress images, make passwords. Nothing is uploaded, ever.
**Tags:** privacy, metadata, exif, image-tools, no-upload, open-source, browser-based, security, screenshot
**Categories:** Privacy · Utilities · Productivity · Developer Tools
**The hook (lead with this on HN/Product Hunt):** Built and run by an *AI agent*, in the open. No human is impersonated. Every tool makes zero network requests — check the network tab.

---

## TIER 1 — Index foundation (do FIRST, ~10 min, your Google/Microsoft login)
*Without these, search engines barely know the site exists. This is the single highest-leverage step.*

- [ ] **Google Search Console** — https://search.google.com/search-console
  - Add property (URL prefix): `https://thefinalmilkman.github.io/zero/`
  - Verify via HTML meta tag → **paste me the token, I'll insert it into index.html and we push**
  - Submit sitemap: `https://thefinalmilkman.github.io/zero/sitemap.xml`
  - Also add + submit the metastrip property separately: `https://thefinalmilkman.github.io/metastrip/`
- [ ] **Bing Webmaster Tools** — https://www.bing.com/webmasters → "Import from Google Search Console" (1 click), same sitemaps.

## TIER 2 — Traffic spikes + permanent backlinks (your account)
- [ ] **Show HN (Hacker News)** — https://news.ycombinator.com/submit
  - Title: `Show HN: Zero – free privacy tools built and run by an AI, nothing uploaded`
  - URL: `https://thefinalmilkman.github.io/zero/`
  - *Why:* privacy + open-source + AI-built is HN catnip. One front-page hit = thousands of visits + a forever backlink.
- [ ] **Product Hunt** — https://www.producthunt.com → schedule a launch. Lead with the "made by an AI" story.
- [ ] **Reddit** (read each sub's self-promo rule, post as a maker not a spammer):
  - r/InternetIsBeautiful · r/privacy · r/privacytoolsIO · r/webdev

## TIER 3 — Tool directories + list backlinks (mix of your login + Arc-prepped PRs)
- [ ] **AlternativeTo** — https://alternativeto.net — add **MetaStrip** as an alternative to: `ImageOptim`, `VerExif`, `exiftool`. Evergreen, relevant traffic.
- [ ] **awesome-privacy (GitHub)** — Arc prepares the pull request; you click submit. Strong backlink, fits the identity.
- [ ] **SaaSHub** — https://www.saashub.com/submit-software
- [ ] **Slant** — https://www.slant.co — answer "best free EXIF/metadata remover" with MetaStrip.
- [ ] **toools.design / free-tool aggregators** — long tail, low effort.

---

## What Arc does solo (no login needed) — staged, pending push auth
1. `robots.txt` pointing to the sitemap (helps crawlers).
2. **FAQPage JSON-LD** ("Is it free? Is anything uploaded?") — can win a rich snippet in search results.
3. `twitter:card` + an Open Graph preview image so shared links render a real card.
4. Add `lastmod` to sitemap; add the `reveal` tool to the structured data.

> **Blocker on all pushes:** the metastrip remote has a live PAT embedded in plaintext (`ghp_YH9a46…`). Revoke it (github.com/settings/tokens), then Arc repoints to a clean remote and pushes the above.

---
*Built by Arc. This file is durable — it works even if the session downgrades. The work outlives the tier.*
