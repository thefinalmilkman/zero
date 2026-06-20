'use strict';
// higgs.js — rediscover the Higgs the way ATLAS/CMS did: reconstruct the INVARIANT MASS of photon pairs
// and watch a narrow peak rise at 125 GeV over a smooth, falling background. Honest simulation using the
// real physics: m_gg^2 = 2*E1*E2*(1 - cos theta). Signal = Gaussian at 125 (detector-resolution-dominated),
// background = falling exponential (QCD continuum). Significance from a SIDEBAND fit (a real bump hunt),
// not from cheating with the truth. Browser (window.HIGGS) + node.

var LO = 100, HI = 160, BINS = 60;            // m_gg histogram range (GeV), 1 GeV bins
var WIN_LO = 120, WIN_HI = 130;               // signal window (~125 +/- 3 sigma)
var MU = 125.1, RES = 1.7, TAU = 30;          // Higgs mass, diphoton mass resolution, bkg falloff scale

function makeRng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function gauss(rng, mu, sig) { var u1 = Math.max(1e-12, rng()), u2 = rng(); return mu + sig * Math.sqrt(-2 * Math.log(u1)) * Math.cos(6.283185307179586 * u2); }
// truncated falling exponential on [lo,hi]
function bkgMass(rng, lo, hi, tau) { var u = rng(); var span = 1 - Math.exp(-(hi - lo) / tau); return lo - tau * Math.log(1 - u * span); }

// synthesize a real two-photon final state whose invariant mass is exactly M, then we RECONSTRUCT m from it.
// E1,E2 >= M/2 guarantees a valid opening angle (cos theta in [-1,1]).
function photonPair(rng, M) { var E1 = M / 2 + rng() * 80, E2 = M / 2 + rng() * 80; var cosT = 1 - (M * M) / (2 * E1 * E2); return { E1: E1, E2: E2, cosT: cosT }; }
function invMass(E1, E2, cosT) { return Math.sqrt(2 * E1 * E2 * (1 - cosT)); }

// generate nBkg background + nSig Higgs events; return array of RECONSTRUCTED masses (via invMass, not the truth)
function genEvents(rng, nBkg, nSig) {
  var out = [];
  for (var i = 0; i < nBkg; i++) { var M = bkgMass(rng, LO, HI, TAU); var p = photonPair(rng, M); out.push(invMass(p.E1, p.E2, p.cosT)); }
  for (var j = 0; j < nSig; j++) { var Ms = gauss(rng, MU, RES); var q = photonPair(rng, Ms); out.push(invMass(q.E1, q.E2, q.cosT)); }
  return out;
}

function binCenter(i) { return LO + (i + 0.5) * (HI - LO) / BINS; }
function addToHist(h, masses) { var w = (HI - LO) / BINS; for (var i = 0; i < masses.length; i++) { var b = Math.floor((masses[i] - LO) / w); if (b >= 0 && b < BINS) h[b]++; } return h; }
function emptyHist() { var h = new Array(BINS); for (var i = 0; i < BINS; i++) h[i] = 0; return h; }

// fit the SMOOTH background from the sidebands only (log-linear = exponential), predict it under the peak.
function bkgFit(h) {
  var xs = [], ys = [];
  for (var i = 0; i < BINS; i++) { var c = binCenter(i); if ((c < WIN_LO || c > WIN_HI) && h[i] > 0) { xs.push(c); ys.push(Math.log(h[i])); } }
  var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (var k = 0; k < n; k++) { sx += xs[k]; sy += ys[k]; sxx += xs[k] * xs[k]; sxy += xs[k] * ys[k]; }
  var den = (n * sxx - sx * sx) || 1, b = (n * sxy - sx * sy) / den, a = (sy - b * sx) / n;
  var pred = new Array(BINS); for (var m = 0; m < BINS; m++) pred[m] = Math.exp(a + b * binCenter(m));
  return { a: a, b: b, pred: pred };
}

// the bump hunt: observed vs sideband-predicted background in the window -> excess S and significance Z = S/sqrt(B)
function significance(h) {
  var fit = bkgFit(h), obs = 0, bexp = 0;
  for (var i = 0; i < BINS; i++) { var c = binCenter(i); if (c >= WIN_LO && c <= WIN_HI) { obs += h[i]; bexp += fit.pred[i]; } }
  var S = obs - bexp, Z = bexp > 0 ? S / Math.sqrt(bexp) : 0;
  // peak bin = largest data-minus-background excess
  var peakBin = 0, peakEx = -1e9;
  for (var j = 0; j < BINS; j++) { var ex = h[j] - fit.pred[j]; if (ex > peakEx) { peakEx = ex; peakBin = j; } }
  return { obs: obs, bexp: bexp, S: S, Z: Z, fit: fit, peakMass: binCenter(peakBin) };
}

var API = {
  LO: LO, HI: HI, BINS: BINS, WIN_LO: WIN_LO, WIN_HI: WIN_HI, MU: MU, RES: RES, TAU: TAU,
  makeRng: makeRng, genEvents: genEvents, emptyHist: emptyHist, addToHist: addToHist,
  binCenter: binCenter, invMass: invMass, photonPair: photonPair, bkgFit: bkgFit, significance: significance,
};
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.HIGGS = API;
