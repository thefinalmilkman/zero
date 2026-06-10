#!/usr/bin/env node
// submit-indexnow.mjs - autonomous URL submission to IndexNow.
// Engines that consume IndexNow: Bing, Yandex, DuckDuckGo, Seznam, Naver.
// (Bing's index also feeds Edge, DuckDuckGo, and ChatGPT/Copilot search.)
// Google does NOT use IndexNow - that channel is the one-time-OAuth Search Console path.
//
// Auth model: NONE. The only proof of ownership is the key file hosted on the
// site itself (keyLocation in indexnow.config.json). No login, no human.
//
// Run:  node submit-indexnow.mjs            -> submits the URL set from the config
//       node submit-indexnow.mjs <url> ...  -> submits the URLs you pass instead
//
// Schedule it (PM2 cron / Task Scheduler) and it needs no human, ever, after the
// key file is live. This is the part of distribution that legitimately self-drives.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(here, 'indexnow.config.json'), 'utf8'));

const urlList = process.argv.slice(2).length ? process.argv.slice(2) : cfg.urls;
const body = { host: cfg.host, key: cfg.key, keyLocation: cfg.keyLocation, urlList };

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

console.log(`IndexNow -> HTTP ${res.status} ${res.statusText}  (${urlList.length} URL${urlList.length === 1 ? '' : 's'})`);
for (const u of urlList) console.log('  ' + u);

if (![200, 202].includes(res.status)) {
  console.log('Body:', await res.text());
  console.log('Hints: 403 = key file not reachable yet (push it live first). 422 = host/URL mismatch.');
  process.exit(1);
}
console.log('OK - submitted. New tools: add their URLs to indexnow.config.json and rerun.');
