/* ============================================================
   QuizBlast — Game Logic (JS only, no Python)
   ============================================================ */

'use strict';

// ── Config ────────────────────────────────────────────────
const DIFF_CFG = {
  easy:   { time: 20, pts: 10,  bonus: 0.5,  label: 'Easy',   emoji: '🌱' },
  medium: { time: 15, pts: 20,  bonus: 0.75, label: 'Medium', emoji: '⚡' },
  hard:   { time: 12, pts: 30,  bonus: 1.0,  label: 'Hard',   emoji: '🔥' },
};

const LETTERS = ['A', 'B', 'C', 'D'];

const VERDICTS = [
  { min: 90, text: '🌟 Genius!',        color: '#6ee7b7' },
  { min: 70, text: '🎉 Excellent!',     color: '#93c5fd' },
  { min: 50, text: '👍 Great Job!',     color: '#c4b5fd' },
  { min: 30, text: '📚 Keep Studying!', color: '#fcd34d' },
  { min: 0,  text: '💪 Try Again!',     color: '#fca5a5' },
];

const CONFETTI_COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ec4899','#fff'];
const LS_KEY = 'quizblast_v1';

// ── State ─────────────────────────────────────────────────
let bank         = {};    // all questions from JSON
let diff         = null;  // selected difficulty
let qs           = [];    // shuffled question pool
let idx          = 0;     // current question index
let score        = 0;
let streak       = 0;
let bestStreak   = 0;
let timer        = null;
let timeLeft     = 0;
let maxTime      = 20;
let history      = [];    // answered questions
let lifelines    = {};
let active       = false;
let toastTimer   = null;

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  fetchQuestions();
  refreshHomeStats();
});

// ── Load Questions JSON ───────────────────────────────────
async function fetchQuestions() {
  try {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    bank = await res.json();
    console.log('✅ Loaded:', Object.keys(bank).map(k => `${k}(${bank[k].length})`).join(', '));
  } catch (e) {
    console.error('❌ Questions load failed', e);
    toast('⚠️ Could not load questions. Refresh the page.', 'bad');
  }
}

// ── Screen Routing ────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active');
  el.scrollTop = 0;
}

// ── Difficulty Selection ──────────────────────────────────
function selectDifficulty(d) {
  diff = d;

  // Update aria + visual
  document.querySelectorAll('.diff-btn').forEach(b => b.setAttribute('aria-checked', 'false'));
  const card = document.getElementById(`diff-${d}`);
  card.setAttribute('aria-checked', 'true');

  // Enable play button
  const btn = document.getElementById('btn-play');
  btn.disabled = false;

  // Show personal best for this difficulty
  const storage = getStorage();
  const best    = storage.bestScores?.[d];
  const el      = document.getElementById('prev-best');
  if (best) {
    el.innerHTML = `Your best on <strong>${DIFF_CFG[d].label}</strong>: <strong>${best.score} pts</strong> (${best.correct}/${best.total} correct)`;
  } else {
    el.textContent = `No record yet for ${DIFF_CFG[d].label} — be the first! 🚀`;
  }
}

function diffKeyHandler(e, d) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDifficulty(d); }
}

// ── Start Game ────────────────────────────────────────────
function startGame() {
  if (!diff || !bank[diff]) return;

  qs         = shuffle([...bank[diff]]);
  idx        = 0;
  score      = 0;
  streak     = 0;
  bestStreak = 0;
  history    = [];
  lifelines  = { fifty: true, skip: true, time: true };
  active     = true;

  resetLifelineUI();
  setDiffTag();
  showScreen('screen-quiz');
  renderQuestion();
}

// ── Render Question ───────────────────────────────────────
function renderQuestion(animate = false) {
  if (idx >= qs.length) { endGame(); return; }

  const card = document.getElementById('q-card');

  if (animate) {
    card.classList.add('slide-out');
    setTimeout(() => {
      card.classList.remove('slide-out');
      fillQuestion();
      card.classList.add('slide-in');
      setTimeout(() => card.classList.remove('slide-in'), 400);
    }, 230);
  } else {
    fillQuestion();
  }
}

function fillQuestion() {
  const q   = qs[idx];
  const cfg = DIFF_CFG[diff];
  const total = qs.length;

  // Counter
  document.getElementById('q-num').textContent   = idx + 1;
  document.getElementById('q-total').textContent = total;

  // Progress
  const pct = (idx / total) * 100;
  const fill = document.getElementById('prog-fill');
  fill.style.width = `${pct}%`;
  document.getElementById('prog-wrap').setAttribute('aria-valuenow', Math.round(pct));

  // Badge + text
  document.getElementById('q-badge').textContent = `${q.icon}  ${q.cat}`;
  document.getElementById('q-text').textContent  = q.q;

  // Answers
  q.opts.forEach((opt, i) => {
    const btn  = document.getElementById(`ans-${i}`);
    const span = document.getElementById(`ans-txt-${i}`);
    btn.className          = 'ans-btn';
    btn.disabled           = false;
    btn.style.opacity      = '1';
    btn.style.pointerEvents = 'auto';
    btn.querySelector('.ans-letter').textContent = LETTERS[i];
    span.textContent = opt;
  });

  // HUD
  document.getElementById('live-score').textContent = score;
  updateStreakPill();

  // Timer
  stopTimer();
  maxTime  = cfg.time;
  timeLeft = cfg.time;
  drawTimer();
  startTimer();
}

// ── Answer Handling ───────────────────────────────────────
function pickAnswer(i) {
  if (!active) return;
  stopTimer();

  const q       = qs[idx];
  const correct = q.ans;
  const right   = i === correct;
  const cfg     = DIFF_CFG[diff];

  // Disable all
  document.querySelectorAll('.ans-btn').forEach(b => b.disabled = true);

  // Colour feedback
  document.getElementById(`ans-${i}`).classList.add(right ? 'correct' : 'wrong');
  if (!right) document.getElementById(`ans-${correct}`).classList.add('reveal');

  // Score
  let pts = 0;
  if (right) {
    const bonus = Math.floor((timeLeft / maxTime) * cfg.pts * cfg.bonus);
    pts    = cfg.pts + bonus;
    score += pts;
    streak++;
    if (streak > bestStreak) bestStreak = streak;
    toast(`✅ +${pts} pts${bonus > 0 ? ` (speed bonus +${bonus})` : ''}`, 'ok');
  } else {
    streak = 0;
    toast(`❌ Correct: ${q.opts[correct]}`, 'bad');
  }

  document.getElementById('live-score').textContent = score;
  updateStreakPill();

  // Log
  history.push({ q: q.q, icon: q.icon, cat: q.cat, right, userIdx: i, ansIdx: correct, opts: q.opts });

  // Advance
  setTimeout(() => {
    idx++;
    if (idx >= qs.length) endGame();
    else renderQuestion(true);
  }, 1500);
}

// ── Lifelines ─────────────────────────────────────────────
function useLifeline(type) {
  if (!lifelines[type]) return;
  lifelines[type] = false;

  if (type === 'fifty') {
    const q = qs[idx];
    let removed = 0;
    for (let i = 0; i < q.opts.length && removed < 2; i++) {
      if (i !== q.ans) {
        const b = document.getElementById(`ans-${i}`);
        b.style.opacity      = '0.2';
        b.style.pointerEvents = 'none';
        removed++;
      }
    }
    document.getElementById('ll-fifty').disabled = true;
    toast('⚡ 50/50 — two wrong answers hidden!', 'info');
  }

  if (type === 'skip') {
    stopTimer();
    const q = qs[idx];
    history.push({ q: q.q, icon: q.icon, cat: q.cat, right: null, userIdx: -1, ansIdx: q.ans, opts: q.opts });
    document.getElementById('ll-skip').disabled = true;
    toast('⏭ Skipped — no penalty!', 'info');
    idx++;
    setTimeout(() => {
      if (idx >= qs.length) endGame();
      else renderQuestion(true);
    }, 700);
  }

  if (type === 'time') {
    timeLeft = Math.min(timeLeft + 8, maxTime + 8);
    drawTimer();
    document.getElementById('ll-time').disabled = true;
    toast('⏱ +8 seconds added!', 'info');
  }
}

function resetLifelineUI() {
  ['fifty', 'skip', 'time'].forEach(id => {
    document.getElementById(`ll-${id}`).disabled = false;
  });
}

// ── Timer ─────────────────────────────────────────────────
function startTimer() {
  drawTimer();
  timer = setInterval(() => {
    timeLeft--;
    drawTimer();
    if (timeLeft <= 0) { stopTimer(); onTimeout(); }
  }, 1000);
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null; }
}

function drawTimer() {
  const arc   = document.getElementById('timer-arc');
  const num   = document.getElementById('timer-num');
  const circ  = 2 * Math.PI * 28; // 175.93
  const ratio = Math.max(timeLeft / maxTime, 0);
  const offset = circ * (1 - ratio);

  arc.style.strokeDashoffset = offset;
  num.textContent = Math.max(0, timeLeft);

  arc.classList.remove('warn', 'danger');
  if (ratio <= 0.25)     arc.classList.add('danger');
  else if (ratio <= 0.5) arc.classList.add('warn');
}

function onTimeout() {
  if (!active) return;
  const q = qs[idx];
  document.querySelectorAll('.ans-btn').forEach(b => b.disabled = true);
  document.getElementById(`ans-${q.ans}`).classList.add('reveal');
  toast(`⏰ Time's up! Answer: ${q.opts[q.ans]}`, 'bad');
  streak = 0;
  updateStreakPill();
  history.push({ q: q.q, icon: q.icon, cat: q.cat, right: false, userIdx: -1, ansIdx: q.ans, opts: q.opts });
  setTimeout(() => {
    idx++;
    if (idx >= qs.length) endGame();
    else renderQuestion(true);
  }, 1500);
}

// ── Streak Pill ───────────────────────────────────────────
function updateStreakPill() {
  const pill  = document.getElementById('streak-pill');
  const num   = document.getElementById('streak-num');
  num.textContent = streak;
  if (streak >= 2) {
    pill.classList.add('on');
  } else {
    pill.classList.remove('on');
  }
}

// ── Quit ──────────────────────────────────────────────────
function quitGame() {
  if (confirm('Quit the current game? Progress will be lost.')) {
    stopTimer();
    active = false;
    goHome();
  }
}

// ── End Game ──────────────────────────────────────────────
function endGame() {
  stopTimer();
  active = false;

  const total   = qs.length;
  const correct = history.filter(h => h.right === true).length;
  const wrong   = history.filter(h => h.right === false).length;
  const pct     = Math.round((correct / total) * 100);

  // Persist
  saveRecord({ diff, score, correct, total, streak: bestStreak });
  refreshHomeStats();

  // Verdict
  const v = VERDICTS.find(v => pct >= v.min) || VERDICTS[VERDICTS.length - 1];
  const verdict = document.getElementById('result-verdict');
  verdict.textContent  = v.text;
  verdict.style.color  = v.color;

  // Medal
  let medal = '😤';
  if (pct >= 90) medal = '🏆';
  else if (pct >= 70) medal = '🥇';
  else if (pct >= 50) medal = '🥈';
  else if (pct >= 30) medal = '🥉';
  document.getElementById('result-medal').textContent = medal;

  // Score card
  document.getElementById('score-big').textContent  = score;
  document.getElementById('score-pct').textContent  = `${pct}% correct — ${correct}/${total} answered`;

  // Stat boxes
  document.getElementById('res-correct').textContent = correct;
  document.getElementById('res-wrong').textContent   = wrong;
  document.getElementById('res-streak').textContent  = bestStreak;

  buildReview();
  buildLeaderboard();

  showScreen('screen-results');

  if (pct >= 70) launchConfetti();
}

// ── Review List ───────────────────────────────────────────
function buildReview() {
  const list = document.getElementById('review-list');
  list.innerHTML = '';

  history.forEach(h => {
    const el = document.createElement('div');
    el.className = 'review-item';
    el.setAttribute('role', 'listitem');

    let statusEmoji = '⏭️';
    if (h.right === true)  statusEmoji = '✅';
    if (h.right === false) statusEmoji = '❌';

    const skipped = h.userIdx < 0;
    let ansLine = '';

    if (skipped) {
      ansLine = `<span>Skipped / Timed out</span> · Correct: <span class="correct-ans">${h.opts[h.ansIdx]}</span>`;
    } else if (h.right) {
      ansLine = `<span class="correct-ans">✓ ${h.opts[h.ansIdx]}</span>`;
    } else {
      ansLine = `Your answer: <span class="wrong-ans">${h.opts[h.userIdx]}</span> · Correct: <span class="correct-ans">${h.opts[h.ansIdx]}</span>`;
    }

    el.innerHTML = `
      <span class="rev-icon">${h.icon}</span>
      <div class="rev-body">
        <div class="rev-q">${h.q}</div>
        <div class="rev-ans">${ansLine}</div>
      </div>
      <span class="rev-status">${statusEmoji}</span>
    `;
    list.appendChild(el);
  });
}

// ── Leaderboard ───────────────────────────────────────────
function buildLeaderboard() {
  const storage = getStorage();
  const entries = (storage.leaderboard || [])
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const list = document.getElementById('lb-list');
  list.innerHTML = '';

  if (!entries.length) {
    list.innerHTML = '<div class="lb-empty">No records yet — complete a game to set one!</div>';
    return;
  }

  const rankIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  entries.forEach((e, i) => {
    const el = document.createElement('div');
    el.className = 'lb-entry' + (i === 0 ? ' top' : '');
    el.setAttribute('role', 'listitem');
    el.innerHTML = `
      <span class="lb-rank">${rankIcons[i]}</span>
      <div class="lb-info">
        <div class="lb-name">${DIFF_CFG[e.diff].emoji} ${DIFF_CFG[e.diff].label}</div>
        <div class="lb-meta">${e.correct}/${e.total} correct · ${new Date(e.date).toLocaleDateString()}</div>
      </div>
      <span class="lb-pts">${e.score} pts</span>
    `;
    list.appendChild(el);
  });
}

// ── Home Stats ────────────────────────────────────────────
function refreshHomeStats() {
  const s      = getStorage();
  const board  = s.leaderboard || [];
  const best   = [...board].sort((a, b) => b.score - a.score)[0];
  const bStreak = s.bestStreak || 0;

  document.getElementById('stat-games').textContent  = board.length;
  document.getElementById('stat-best').textContent   = best ? `${best.score}` : '—';
  document.getElementById('stat-streak').textContent = bStreak;
}

// ── Navigation ────────────────────────────────────────────
function goHome() {
  stopTimer();
  active = false;
  showScreen('screen-home');
  refreshHomeStats();
}

// ── LocalStorage ──────────────────────────────────────────
function getStorage() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}

function setStorage(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
  catch (e) { console.warn('Storage error', e); }
}

function saveRecord({ diff, score, correct, total, streak }) {
  const s = getStorage();

  // Leaderboard
  if (!s.leaderboard) s.leaderboard = [];
  s.leaderboard.push({ diff, score, correct, total, date: Date.now() });
  if (s.leaderboard.length > 50) s.leaderboard = s.leaderboard.slice(-50);

  // Per-diff best
  if (!s.bestScores) s.bestScores = {};
  if (!s.bestScores[diff] || score > s.bestScores[diff].score) {
    s.bestScores[diff] = { score, correct, total };
  }

  // Global best streak
  if ((s.bestStreak || 0) < streak) s.bestStreak = streak;

  setStorage(s);
}

// ── HUD Helpers ───────────────────────────────────────────
function setDiffTag() {
  const tag = document.getElementById('diff-tag');
  tag.textContent = DIFF_CFG[diff].label;
  tag.className   = `diff-tag ${diff}`;
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type = 'info') {
  clearTimeout(toastTimer);
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast ${type} show`;
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ── Confetti ──────────────────────────────────────────────
function launchConfetti() {
  for (let i = 0; i < 90; i++) {
    setTimeout(() => spawnConfetti(), i * 22);
  }
}

function spawnConfetti() {
  const el    = document.createElement('div');
  el.className = 'confetti';
  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  const x     = Math.random() * window.innerWidth;
  const dur   = 2 + Math.random() * 2.5;
  const size  = 7 + Math.random() * 9;

  el.style.cssText = `
    left:${x}px;
    width:${size}px; height:${size}px;
    background:${color};
    animation-duration:${dur}s;
    border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
    opacity:${0.7 + Math.random() * 0.3};
  `;

  document.body.appendChild(el);
  setTimeout(() => el.remove(), (dur + 0.2) * 1000);
}

// ── Shuffle ───────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
