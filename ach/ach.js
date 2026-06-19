'use strict';
// ach.js -- the ACH (Analysis of Competing Hypotheses) reasoning engine. Pure functions, zero deps.
// Runs in the browser (attached to window.ACH) and in node (module.exports) -- same code, tested headless.
//
// The discipline (Richards Heuer, CIA, 1970s), encoded honestly:
//  - You score hypotheses by INCONSISTENCY and the LEAST-inconsistent wins. You disprove, you don't confirm.
//    (Consistent evidence is consistent with rival hypotheses too -- it can't single one out.)
//  - Evidence that is consistent/NA with EVERY hypothesis has ZERO diagnostic value. The engine flags it.
//  - Source grade matters: an inconsistency backed by an A1 source weighs more than one from an F6.
//  - If the conclusion flips when you pull one weak source, that's the Curveball single-source trap. Flagged.
//
// Honest by construction: it will not let you hide a weak linchpin or mistake "consistent with everything"
// for proof. That is the whole point.

// Admiralty / NATO AJP-2.1 source grading -> a 0..1 weight. (F/6 = "cannot be judged": cautious, not zero.)
var RELIABILITY = { A: 1.00, B: 0.85, C: 0.70, D: 0.50, E: 0.30, F: 0.45 };
var CREDIBILITY = { 1: 1.00, 2: 0.85, 3: 0.70, 4: 0.50, 5: 0.30, 6: 0.45 };

// A cell is the analyst's read of one evidence item against one hypothesis.
//   C  = Consistent             -> 0 inconsistency (does NOT favor the hypothesis; just doesn't argue against it)
//   I  = Inconsistent           -> 1
//   II = Strongly inconsistent  -> 2
//   NA = Not applicable / neutral-> 0
var CELL = { C: 0, I: 1, II: 2, NA: 0 };

function clampGrade(map, v, dflt) { return Object.prototype.hasOwnProperty.call(map, v) ? map[v] : dflt; }

// Source weight for an evidence row (reliability x credibility), 0..1. Defaults to mid if ungraded.
function weightOf(ev) {
  var r = clampGrade(RELIABILITY, ev && ev.reliability, 0.6);
  var c = clampGrade(CREDIBILITY, ev && ev.credibility, 0.6);
  return r * c;
}

function cellInc(code) { return clampGrade(CELL, code, 0); }

// Weighted inconsistency score per hypothesis. LOWER = stronger (least disproved).
function scores(hypotheses, evidence) {
  return hypotheses.map(function (_h, hi) {
    var inc = 0;
    for (var k = 0; k < evidence.length; k++) {
      var cells = evidence[k].cells || [];
      inc += cellInc(cells[hi]) * weightOf(evidence[k]);
    }
    return inc;
  });
}

// Diagnosticity of an evidence row = how much it DISCRIMINATES among hypotheses (variance of its cell
// values across hypotheses), scaled by source weight. Variance 0 (all cells identical) => tells you nothing.
function diagnosticity(ev, hypothesisCount) {
  var cells = (ev.cells || []).slice(0, hypothesisCount);
  var n = hypothesisCount || cells.length || 1;
  var vals = [];
  for (var i = 0; i < n; i++) vals.push(cellInc(cells[i]));
  var mean = vals.reduce(function (a, b) { return a + b; }, 0) / n;
  var variance = vals.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / n;
  return variance * weightOf(ev);
}

function isNonDiagnostic(ev, hypothesisCount) {
  var cells = (ev.cells || []).slice(0, hypothesisCount);
  var distinct = {};
  for (var i = 0; i < hypothesisCount; i++) distinct[cellInc(cells[i])] = true;
  return Object.keys(distinct).length <= 1; // every hypothesis read the same way => no discrimination
}

// The full analysis. Returns ranking (ascending inconsistency), the leader, diagnosticity per row,
// the decisive rows (pull it and the leader changes), the Curveball alarm, and separation honesty.
function analyze(hypotheses, evidence) {
  var sc = scores(hypotheses, evidence);
  var ranking = hypotheses
    .map(function (name, i) { return { i: i, name: name, score: sc[i] }; })
    .sort(function (a, b) { return a.score - b.score || a.i - b.i; });
  var leader = ranking[0] || null;
  var runnerUp = ranking[1] || null;

  // relative standing -- NOT a calibrated probability. (maxScore - score), normalized. Disclaimed in UI.
  var maxScore = ranking.length ? ranking[ranking.length - 1].score : 0;
  var standingRaw = ranking.map(function (r) { return (maxScore - r.score) + 0.0001; });
  var standSum = standingRaw.reduce(function (a, b) { return a + b; }, 0) || 1;
  var standing = {};
  ranking.forEach(function (r, idx) { standing[r.i] = standingRaw[idx] / standSum; });

  // per-row diagnosticity + non-diagnostic flags
  var rows = evidence.map(function (ev, ri) {
    return {
      ri: ri,
      diagnosticity: diagnosticity(ev, hypotheses.length),
      nonDiagnostic: isNonDiagnostic(ev, hypotheses.length),
      weight: weightOf(ev),
      reliability: ev.reliability, credibility: ev.credibility,
    };
  });

  // sensitivity: which single evidence rows, if removed, change who leads?
  var decisive = [];
  if (leader && evidence.length > 1) {
    for (var ri = 0; ri < evidence.length; ri++) {
      var sub = evidence.filter(function (_e, k) { return k !== ri; });
      var sc2 = scores(hypotheses, sub);
      var top2 = hypotheses
        .map(function (_n, i) { return { i: i, score: sc2[i] }; })
        .sort(function (a, b) { return a.score - b.score || a.i - b.i; })[0];
      if (top2 && top2.i !== leader.i) decisive.push(ri);
    }
  }

  // Curveball alarm: the conclusion flips on a row whose source is weak/uncorroborated (D/E/F or 4/5/6),
  // or the whole conclusion hangs on a single decisive row.
  var alarms = [];
  decisive.forEach(function (ri) {
    var ev = evidence[ri];
    var weakRel = ['D', 'E', 'F'].indexOf(ev.reliability) >= 0;
    var weakCred = [4, 5, 6, '4', '5', '6'].indexOf(ev.credibility) >= 0;
    if (weakRel || weakCred) {
      alarms.push({
        type: 'curveball', ri: ri,
        msg: 'Your conclusion depends on a weak/uncorroborated source (row ' + (ri + 1) + ', graded ' +
          (ev.reliability || '?') + (ev.credibility || '?') + '). This is the single-source dependence ' +
          'that produced the 2002 Iraq-WMD failure. Corroborate it before you rely on it.',
      });
    }
  });
  if (decisive.length === 1 && !alarms.length) {
    alarms.push({ type: 'single-point', ri: decisive[0],
      msg: 'The entire conclusion turns on one piece of evidence (row ' + (decisive[0] + 1) +
        '). One row should not decide a high-stakes call -- seek corroboration or alternatives.' });
  }

  // separation honesty: is the leader actually distinguished from #2?
  var separation = (leader && runnerUp) ? (runnerUp.score - leader.score) : Infinity;
  var weakSeparation = (leader && runnerUp) && separation < 0.5; // tune: < ~half a weighted strike
  if (weakSeparation) {
    alarms.push({ type: 'unresolved',
      msg: 'The leading hypothesis is barely separated from the next (' + leader.name + ' vs ' +
        runnerUp.name + '). Treat this as UNRESOLVED, not decided -- you need diagnostic evidence, not more of the same.' });
  }

  // nudge to strip dead weight
  var nonDiag = rows.filter(function (r) { return r.nonDiagnostic; }).map(function (r) { return r.ri; });

  return {
    scores: sc, ranking: ranking, leader: leader, runnerUp: runnerUp,
    standing: standing, rows: rows, decisive: decisive, alarms: alarms,
    separation: separation, weakSeparation: !!weakSeparation, nonDiagnosticRows: nonDiag,
  };
}

// ICD-203 / Sherman Kent estimative-probability ladder. The analyst assigns LIKELIHOOD here, separately
// from CONFIDENCE -- the two must never be combined in one sentence (the classic conflation error).
var ESTIMATIVE = [
  { band: 'almost no chance', lo: 1, hi: 5 },
  { band: 'very unlikely', lo: 5, hi: 20 },
  { band: 'unlikely', lo: 20, hi: 45 },
  { band: 'roughly even chance', lo: 45, hi: 55 },
  { band: 'likely', lo: 55, hi: 80 },
  { band: 'very likely', lo: 80, hi: 95 },
  { band: 'almost certain', lo: 95, hi: 99 },
];
var CONFIDENCE = {
  high: 'high confidence -- multiple, mostly reliable, minimally conflicting sources and solid reasoning',
  moderate: 'moderate confidence -- credible and plausible, but not enough corroboration for high confidence',
  low: 'low confidence -- scant, questionable, or poorly corroborated information; weak inferences',
};

// Build the assessment sentence WITHOUT combining likelihood and confidence in one clause (ICD-203 rule).
function assessmentText(leaderName, band, confidenceKey) {
  if (!leaderName) return '';
  var conf = CONFIDENCE[confidenceKey] || CONFIDENCE.low;
  return 'We assess it is ' + (band || 'roughly even chance') + ' that ' + leaderName + '. ' +
    'We hold ' + (confidenceKey || 'low') + ' confidence in this judgment (' + conf + ').';
}

var API = {
  RELIABILITY: RELIABILITY, CREDIBILITY: CREDIBILITY, CELL: CELL, ESTIMATIVE: ESTIMATIVE, CONFIDENCE: CONFIDENCE,
  weightOf: weightOf, scores: scores, diagnosticity: diagnosticity, isNonDiagnostic: isNonDiagnostic,
  analyze: analyze, assessmentText: assessmentText,
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.ACH = API;
