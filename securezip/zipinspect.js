'use strict';
// zipinspect.js — a ZIP archive inspector, from scratch, ZERO dependencies, 100% in your browser.
// Parses the container + inflates entries (the same from-scratch engine as zipfromscratch/zip.js),
// then ANALYZES for threats: Zip-Slip, zip bombs, broken ZipCrypto, executables, polyglot/appended
// bytes, and local-vs-central tampering. Nothing is uploaded — turn off your wifi, it still works.
(function () {
  // ---------- CRC-32 ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = (CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8)) >>> 0; return (c ^ 0xFFFFFFFF) >>> 0; }

  // ---------- RFC 1951 tables ----------
  const LB = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  const LE = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DB = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  const DE = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const CLO = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  function BR(buf) { return { buf, pos: 0, bb: 0, bc: 0 }; }
  function bit(r) { if (r.bc === 0) { r.bb = r.buf[r.pos++]; r.bc = 8; } const b = r.bb & 1; r.bb >>= 1; r.bc--; return b; }
  function bits(r, n) { let v = 0; for (let i = 0; i < n; i++) v |= bit(r) << i; return v >>> 0; }
  function buildHuff(L) { const count = new Array(16).fill(0); for (const l of L) count[l]++; count[0] = 0; const offs = new Array(16).fill(0); for (let i = 1; i < 15; i++) offs[i + 1] = offs[i] + count[i]; const sym = new Array(L.length).fill(0); for (let s = 0; s < L.length; s++) if (L[s]) sym[offs[L[s]]++] = s; return { count, sym }; }
  function dec(r, h) { let code = 0, first = 0, idx = 0; for (let len = 1; len <= 15; len++) { code |= bit(r); const c = h.count[len]; if (code - first < c) return h.sym[idx + (code - first)]; idx += c; first += c; first <<= 1; code <<= 1; } throw new Error('bad Huffman code'); }
  function fixedT() { const ll = new Array(288); for (let i = 0; i < 144; i++) ll[i] = 8; for (let i = 144; i < 256; i++) ll[i] = 9; for (let i = 256; i < 280; i++) ll[i] = 7; for (let i = 280; i < 288; i++) ll[i] = 8; return { L: buildHuff(ll), D: buildHuff(new Array(30).fill(5)) }; }
  function dynT(r) { const hlit = bits(r, 5) + 257, hdist = bits(r, 5) + 1, hclen = bits(r, 4) + 4; const cl = new Array(19).fill(0); for (let i = 0; i < hclen; i++) cl[CLO[i]] = bits(r, 3); const ch = buildHuff(cl); const lens = []; while (lens.length < hlit + hdist) { const s = dec(r, ch); if (s < 16) lens.push(s); else if (s === 16) { const n = bits(r, 2) + 3, p = lens[lens.length - 1]; for (let i = 0; i < n; i++) lens.push(p); } else if (s === 17) { const n = bits(r, 3) + 3; for (let i = 0; i < n; i++) lens.push(0); } else { const n = bits(r, 7) + 11; for (let i = 0; i < n; i++) lens.push(0); } } return { L: buildHuff(lens.slice(0, hlit)), D: buildHuff(lens.slice(hlit)) }; }

  function inflate(buf, cap) {                       // cap = max output bytes (zip-bomb guard); throws if exceeded
    const r = BR(buf), out = []; let fin;
    do {
      fin = bit(r); const bt = bits(r, 2);
      if (bt === 0) { r.bc = 0; const len = r.buf[r.pos] | (r.buf[r.pos + 1] << 8); r.pos += 4; for (let i = 0; i < len; i++) out.push(r.buf[r.pos++]); }
      else if (bt === 1 || bt === 2) {
        const t = bt === 1 ? fixedT() : dynT(r);
        for (; ;) { const s = dec(r, t.L); if (s < 256) out.push(s); else if (s === 256) break; else { const l = s - 257, length = LB[l] + bits(r, LE[l]); const ds = dec(r, t.D), dist = DB[ds] + bits(r, DE[ds]); let st = out.length - dist; for (let i = 0; i < length; i++) out.push(out[st + i]); } }
      } else throw new Error('bad block type');
      if (cap && out.length > cap) throw new Error('output exceeds safety cap (' + cap + ' bytes) — aborted');
    } while (!fin);
    return Uint8Array.from(out);
  }

  // ---------- deflate (for the built-in sample threats) ----------
  function BW() { return { bytes: [], bb: 0, bc: 0 }; }
  function wb(w, b) { w.bb |= (b & 1) << w.bc; if (++w.bc === 8) { w.bytes.push(w.bb); w.bb = 0; w.bc = 0; } }
  function wbits(w, v, n) { for (let i = 0; i < n; i++) wb(w, (v >> i) & 1); }
  function whuff(w, c, n) { for (let i = n - 1; i >= 0; i--) wb(w, (c >> i) & 1); }
  function canon(L) { const bc = new Array(16).fill(0); for (const l of L) if (l) bc[l]++; const nx = new Array(16).fill(0); let code = 0; for (let b = 1; b <= 15; b++) { code = (code + bc[b - 1]) << 1; nx[b] = code; } const codes = new Array(L.length).fill(0); for (let s = 0; s < L.length; s++) if (L[s]) codes[s] = nx[L[s]]++; return codes; }
  function deflateRaw(data) {
    const ll = new Array(288); for (let i = 0; i < 144; i++) ll[i] = 8; for (let i = 144; i < 256; i++) ll[i] = 9; for (let i = 256; i < 280; i++) ll[i] = 7; for (let i = 280; i < 288; i++) ll[i] = 8;
    const dl = new Array(30).fill(5), lc = canon(ll), dc = canon(dl), w = BW(); wbits(w, 1, 1); wbits(w, 1, 2);
    const n = data.length, head = new Int32Array(65536).fill(-1), prev = new Int32Array(n).fill(-1);
    const hash = (i) => ((data[i] << 16) ^ (data[i + 1] << 8) ^ data[i + 2]) & 0xFFFF;
    const lco = (l) => { let c = 0; while (c < 28 && LB[c + 1] <= l) c++; return c; }, dco = (d) => { let c = 0; while (c < 29 && DB[c + 1] <= d) c++; return c; };
    let i = 0;
    while (i < n) {
      let bl = 0, bd = 0;
      if (i + 3 <= n) { let j = head[hash(i)], ch = 0; while (j >= 0 && ch < 256) { const m = Math.min(258, n - i); let l = 0; while (l < m && data[j + l] === data[i + l]) l++; if (l > bl && (i - j) <= 32768) { bl = l; bd = i - j; } j = prev[j]; ch++; } }
      if (bl >= 3) { const c = lco(bl), s = 257 + c; whuff(w, lc[s], ll[s]); wbits(w, bl - LB[c], LE[c]); const d = dco(bd); whuff(w, dc[d], dl[d]); wbits(w, bd - DB[d], DE[d]); const e = i + bl; while (i < e) { if (i + 3 <= n) { const h = hash(i); prev[i] = head[h]; head[h] = i; } i++; } }
      else { whuff(w, lc[data[i]], ll[data[i]]); if (i + 3 <= n) { const h = hash(i); prev[i] = head[h]; head[h] = i; } i++; }
    }
    whuff(w, lc[256], ll[256]); if (w.bc) w.bytes.push(w.bb); return Uint8Array.from(w.bytes);
  }
  function concat(a) { let n = 0; for (const x of a) n += x.length; const o = new Uint8Array(n); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; }
  const enc = (s) => new TextEncoder().encode(s);
  function zipCreate(entries) {
    const chunks = [], central = []; let off = 0; const dosDate = ((2026 - 1980) << 9) | (6 << 5) | 20;
    for (const e of entries) {
      const name = enc(e.name), data = e.data instanceof Uint8Array ? e.data : enc(e.data), crc = crc32(data);
      let method = 8, comp = deflateRaw(data); if (comp.length >= data.length) { method = 0; comp = data; }
      const lh = new Uint8Array(30), dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true); dv.setUint16(8, method, true); dv.setUint16(12, dosDate, true); dv.setUint32(14, crc, true); dv.setUint32(18, comp.length, true); dv.setUint32(22, data.length, true); dv.setUint16(26, name.length, true);
      chunks.push(lh, name, comp);
      const cd = new Uint8Array(46), cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, method, true); cv.setUint16(14, dosDate, true); cv.setUint32(16, crc, true); cv.setUint32(20, comp.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, off, true);
      central.push(cd, name); off += 30 + name.length + comp.length;
    }
    const cdb = concat(central), eo = new Uint8Array(22), ev = new DataView(eo.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true); ev.setUint32(12, cdb.length, true); ev.setUint32(16, off, true);
    return concat([...chunks, cdb, eo]);
  }

  // ---------- THE ANALYZER ----------
  const EXEC = /\.(exe|scr|bat|cmd|com|pif|js|jse|vbs|vbe|wsf|wsh|ps1|psm1|dll|msi|jar|lnk|hta|reg|sh|app|gadget|cpl)$/i;
  const DOUBLE = /\.(pdf|doc|docx|txt|jpg|jpeg|png|gif|csv|xls|xlsx|zip|html?)\s*\.(exe|scr|com|bat|cmd|pif|js|vbs|jar)$/i;
  function nameRisks(name) {
    const r = [], parts = name.split(/[\\/]/), base = parts[parts.length - 1] || '';
    if (/^([a-zA-Z]:|[\\/])/.test(name) || parts.includes('..')) r.push({ level: 'danger', msg: 'Zip-Slip: path traversal — this entry tries to write OUTSIDE the extract folder' });
    if (/[ -]/.test(name)) r.push({ level: 'danger', msg: 'control characters hidden in the filename' });
    if (/‮/.test(name)) r.push({ level: 'danger', msg: 'right-to-left override (\\u202e) — extension spoofing' });
    if (DOUBLE.test(base)) r.push({ level: 'danger', msg: 'double extension (e.g. invoice.pdf.exe) — disguised executable' });
    else if (EXEC.test(base)) r.push({ level: 'warn', msg: 'executable / script content' });
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(base)) r.push({ level: 'warn', msg: 'reserved Windows device name' });
    if (/\.(zip|jar|apk|7z|rar|gz|tar)$/i.test(base)) r.push({ level: 'info', msg: 'nested archive (recursion risk if auto-extracted)' });
    return r;
  }
  const METH = { 0: 'stored', 8: 'deflate', 9: 'deflate64', 12: 'bzip2', 14: 'lzma', 93: 'zstd', 99: 'AES' };

  function analyze(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const rep = { valid: false, fileSize: bytes.length, entries: [], threats: [], verdict: 'SAFE', entryCount: 0, totalComp: 0, totalUncomp: 0 };
    // find EOCD (scan back past variable comment)
    let p = -1; for (let i = bytes.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { p = i; break; }
    if (p < 0) { rep.error = 'No End-Of-Central-Directory found — this is not a valid ZIP file.'; return rep; }
    rep.valid = true;
    const count = dv.getUint16(p + 10, true), cdOff = dv.getUint32(p + 16, true), commentLen = dv.getUint16(p + 20, true);
    const eocdEnd = p + 22 + commentLen;
    if (eocdEnd < bytes.length) rep.threats.push({ level: 'warn', title: 'Appended data', detail: (bytes.length - eocdEnd) + ' bytes exist AFTER the ZIP ends — could be a hidden payload or a polyglot.' });
    // polyglot/SFX: bytes before the first local header
    let firstLH = -1; for (let i = 0; i + 4 <= bytes.length; i++) if (dv.getUint32(i, true) === 0x04034b50) { firstLH = i; break; }
    if (firstLH > 0) rep.threats.push({ level: 'warn', title: 'Prefix bytes (possible self-extracting EXE / polyglot)', detail: firstLH + ' bytes sit BEFORE the first ZIP entry. A normal zip starts at byte 0; this one is wrapped in something else (often an .exe stub).' });
    let o = cdOff, danger = 0, warn = 0;
    for (let k = 0; k < count && o + 46 <= bytes.length; k++) {
      if (dv.getUint32(o, true) !== 0x02014b50) { rep.threats.push({ level: 'danger', title: 'Corrupt central directory', detail: 'Entry ' + k + ' has a bad signature.' }); break; }
      const gp = dv.getUint16(o + 8, true), method = dv.getUint16(o + 10, true), crc = dv.getUint32(o + 16, true);
      const comp = dv.getUint32(o + 20, true), uncomp = dv.getUint32(o + 24, true);
      const nl = dv.getUint16(o + 28, true), el = dv.getUint16(o + 30, true), cl = dv.getUint16(o + 32, true), lho = dv.getUint32(o + 42, true);
      const utf8 = !!(gp & 0x800);
      const name = new TextDecoder(utf8 ? 'utf-8' : 'windows-1252').decode(bytes.subarray(o + 46, o + 46 + nl));
      // AES?
      let aes = false, ex = o + 46 + nl, exEnd = ex + el; while (ex + 4 <= exEnd) { const id = dv.getUint16(ex, true), sz = dv.getUint16(ex + 2, true); if (id === 0x9901) aes = true; ex += 4 + sz; }
      const risks = nameRisks(name);
      if (comp > 0) { const ratio = uncomp / comp; if (ratio > 1000 || (ratio > 100 && uncomp > 1e6)) risks.push({ level: 'danger', msg: Math.round(ratio) + ':1 ratio expanding to ' + (uncomp / 1e6).toFixed(1) + ' MB — ZIP BOMB pattern (never auto-extract)' }); else if (ratio > 100) risks.push({ level: 'warn', msg: 'high ' + Math.round(ratio) + ':1 compression ratio' }); }
      if (gp & 1) risks.push(aes ? { level: 'warn', msg: 'AES-encrypted (filenames + sizes still exposed)' } : { level: 'danger', msg: 'ZipCrypto encryption — cryptographically BROKEN (crackable in minutes; treat as plaintext)' });
      if (!(method in METH)) risks.push({ level: 'warn', msg: 'unknown compression method ' + method });
      // local-vs-central mismatch
      let mismatch = null;
      if (lho + 30 <= bytes.length && dv.getUint32(lho, true) === 0x04034b50) {
        const lgp = dv.getUint16(lho + 6, true), lnl = dv.getUint16(lho + 26, true);
        const lname = new TextDecoder(utf8 ? 'utf-8' : 'windows-1252').decode(bytes.subarray(lho + 30, lho + 30 + lnl));
        if (lname !== name) mismatch = 'name differs (central="' + name + '" vs local="' + lname + '")';
        else if (!(lgp & 8)) { const lc = dv.getUint32(lho + 18, true), lu = dv.getUint32(lho + 22, true); if (lc !== comp || lu !== uncomp) mismatch = 'sizes differ between the file list and the header'; }
        if (mismatch) risks.push({ level: 'danger', msg: 'central directory disagrees with the local header — ' + mismatch + ' (AV-evasion technique)' });
      }
      const lvl = risks.some(x => x.level === 'danger') ? 'danger' : risks.some(x => x.level === 'warn') ? 'warn' : 'ok';
      if (lvl === 'danger') danger++; else if (lvl === 'warn') warn++;
      rep.entries.push({ name, method, methodName: METH[method] || ('?' + method), encrypted: !!(gp & 1), aes, comp, uncomp, crc, lho, risks, level: lvl, mismatch });
      rep.totalComp += comp; rep.totalUncomp += uncomp;
      o += 46 + nl + el + cl;
    }
    rep.entryCount = rep.entries.length;
    rep.ratio = rep.totalComp ? rep.totalUncomp / rep.totalComp : 0;
    if (rep.totalUncomp > 1e9 || (rep.ratio > 1000 && rep.totalUncomp > 5e7)) rep.threats.push({ level: 'danger', title: 'ZIP bomb signature', detail: 'Total expands to ' + (rep.totalUncomp / 1e6).toFixed(0) + ' MB at ' + Math.round(rep.ratio) + ':1 — classic decompression bomb.' });
    if (rep.entryCount > 5000) rep.threats.push({ level: 'warn', title: 'Huge entry count', detail: rep.entryCount + ' entries.' });
    const anyDanger = danger > 0 || rep.threats.some(t => t.level === 'danger');
    const anyWarn = warn > 0 || rep.threats.some(t => t.level === 'warn');
    rep.verdict = anyDanger ? 'DANGER' : anyWarn ? 'CAUTION' : 'SAFE';
    return rep;
  }

  function extract(bytes, entry) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const lnl = dv.getUint16(entry.lho + 26, true), lel = dv.getUint16(entry.lho + 28, true);
    const start = entry.lho + 30 + lnl + lel, comp = bytes.subarray(start, start + entry.comp);
    return entry.method === 0 ? comp.slice() : inflate(comp, Math.max(entry.uncomp + 16, 1e9));
  }
  async function sha256(bytes) { const h = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }

  function makeSampleThreat() {
    return zipCreate([
      { name: 'README.txt', data: 'A perfectly normal, safe text file.' },
      { name: '../../../Startup/run.bat', data: 'echo you just got Zip-Slipped' },          // path traversal + exec
      { name: 'Invoice_2026.pdf.exe', data: 'MZ\x90\x00 (a disguised executable)' },          // double extension
      { name: 'photos.zip', data: 'nested archive bytes' },                                   // nested archive
      { name: 'bomb.dat', data: new Uint8Array(2000000) },                                    // 2 MB of zeros -> bomb-pattern ratio
    ]);
  }
  function makeCleanSample() {
    return zipCreate([
      { name: 'notes.txt', data: 'Just my notes. Nothing dangerous in here.' },
      { name: 'data/report.csv', data: 'a,b,c\n1,2,3\n'.repeat(50) },
    ]);
  }

  window.ZIPINSPECT = { crc32, inflate, deflateRaw, zipCreate, analyze, extract, sha256, makeSampleThreat, makeCleanSample };
})();
