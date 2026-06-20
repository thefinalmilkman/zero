# Zero — Discovery Kit
**Purpose:** the engine that gets Zero *found* — so the work brings people in without anyone having to do outreach. Arc does everything that needs no login; Milton spends ~10–15 min on the logins only he can do.
**Live hub:** https://thefinalmilkman.github.io/zero/ · **Flagship:** https://thefinalmilkman.github.io/metastrip/
*Updated 2026-06-20 — full current toolset + IndexNow live.*

---

## The current library (12 live tools — all CC0 / open, nothing uploaded)
Hub · MetaStrip · Screenshot Scrubber · Image Compressor · Password Generator · What You're Broadcasting · What Does Your Photo Reveal? · **Codewise** (car check-engine codes) · **Clarity Matrix** (ACH) · **Story Auditor** · **StoryBrand Generator** · **Collider** (real CERN data) · **The Work** (self-proving portfolio)

## Paste-ready copy (verbatim — no rewriting)
- **Name:** Zero
- **Tagline (≤60):** Free tools that run in your browser — nothing uploaded
- **One-liner:** Free, open-source tools that run entirely in your browser. Strip photo metadata, scrub screenshots, decode car codes, weigh competing theories, find real particles in CERN data — nothing is ever uploaded.
- **Tags:** privacy, metadata, exif, image-tools, no-upload, open-source, browser-based, free-tools, car-diagnostics, education
- **The hook (lead with this on HN / Product Hunt):** Built and run by an *AI agent*, in the open. No human is impersonated. Every tool makes zero network requests — check the network tab.

---

## ✅ TIER 0 — Arc did these (no login needed)
- [x] `robots.txt` → points to the sitemap.
- [x] `sitemap.xml` → all 12 tools, with lastmod + priorities.
- [x] **JSON-LD** per tool (SoftwareApplication) + FAQPage on the hub → eligible for rich snippets.
- [x] Canonical + OpenGraph tags on every tool.
- [x] **IndexNow live** — key `a7184f515b6749c5a9d05b0a93eb3abc` hosted at `/zero/a7184f…txt`. **Fires after the next push** (notifies Bing / Yandex / Seznam instantly, no Google account needed). Submit command:
  ```
  curl -s "https://api.indexnow.org/indexnow" -H "Content-Type: application/json" -d @indexnow-submit.json
  ```
  (`indexnow-submit.json` ships in the repo with all 12 URLs.)

## TIER 1 — Index foundation (Milton's Google/Microsoft login, ~10 min — the single highest-leverage step)
*Without this, Google barely knows the site exists. This is the one part Arc genuinely cannot do — it needs your login.*
- [ ] **Google Search Console** — https://search.google.com/search-console
  1. Add property (URL prefix): `https://thefinalmilkman.github.io/zero/`
  2. Verify via **HTML tag** → **paste Arc the `<meta name="google-site-verification" ...>` token; Arc inserts it into index.html and we push.**
  3. Submit sitemap: `sitemap.xml`
  4. Repeat for the flagship: add property `https://thefinalmilkman.github.io/metastrip/`
- [ ] **Bing Webmaster Tools** — https://www.bing.com/webmasters → "Import from Google Search Console" (1 click). (IndexNow already feeds Bing, but importing adds the dashboard.)

## TIER 2 — Traffic spikes + permanent backlinks (your account)
- [ ] **Show HN** — https://news.ycombinator.com/submit · Title: `Show HN: Zero – free tools built and run by an AI, nothing uploaded` · URL: the hub. One front-page hit = thousands of visits + a forever backlink.
- [ ] **Product Hunt** — schedule a launch; lead with the "made by an AI, in the open" story.
- [ ] **Reddit** (post as a maker, read each sub's self-promo rule): r/InternetIsBeautiful · r/privacy · r/webdev · r/MechanicAdvice (for Codewise).

## TIER 3 — Directories + niche backlinks (mix of your login + Arc-prepped PRs)
- [ ] **AlternativeTo** — add MetaStrip as an alternative to ImageOptim / VerExif / exiftool.
- [ ] **awesome-privacy (GitHub)** — *Arc prepares the PR, you click submit.*
- [ ] **Codewise → car forums / r/MechanicAdvice / AlternativeTo** ("what's my check-engine code", offline, no app).
- [ ] **SaaSHub · Slant · toools.design** — long tail, low effort.

---
## Honest status notes (corrected 2026-06-20)
- **The old "push blocker" is GONE.** The earlier note about a plaintext `ghp_YH9a46…` PAT on the *metastrip* remote is stale — that PAT is dead (GitHub returns 401), and the **zero repo pushes cleanly** via `gh auth` (Collider, The Work, etc. all shipped this way). Pushes work.
- **What's still genuinely Milton-only:** the Google Search Console + Bing logins, and the social/directory posts (HN, Product Hunt, Reddit, AlternativeTo) — those need a human account. Everything else Arc carries.
- The `index.html` "Work with Zero" front door (hero CTA + contact section) is **staged but un-shipped** — it waits on one decision: the contact endpoint (email / Telegram / form). Discovery does not depend on it.

*Built by Arc. Durable by design — it works even if the session resets. The work outlives the tier.*
