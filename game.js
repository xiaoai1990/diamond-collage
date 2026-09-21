/* 钻石拼贴 · 可玩原型
 * 网格脉络模板 + 自由选色贴钻 + 音效/震动 + 完成揭晓 + 高清导出
 */
"use strict";

/* ============ 水钻色板(参照真实水钻色系,自绘避版权) ============ */
const GEMS = [
  { name: "水晶白", base: "#f5f7ff", light: "#ffffff", dark: "#b9c2dd" },
  { name: "香槟金", base: "#f2ddad", light: "#fff6dd", dark: "#c4a567" },
  { name: "黄金",   base: "#f6c945", light: "#fff0b8", dark: "#c2901f" },
  { name: "银灰",   base: "#c9cdd8", light: "#f2f4f9", dark: "#8e94a8" },
  { name: "石墨黑", base: "#4a4658", light: "#7d7893", dark: "#262334" },
  { name: "正红",   base: "#e04a4f", light: "#ff8d8d", dark: "#9c2229" },
  { name: "玫红",   base: "#e04a8f", light: "#ff92c4", dark: "#9c2260" },
  { name: "樱花粉", base: "#f7b8cf", light: "#ffe4ee", dark: "#d07fa0" },
  { name: "珊瑚橙", base: "#f28a5f", light: "#ffc7a8", dark: "#bf5630" },
  { name: "紫水晶", base: "#9b6cf0", light: "#cdaaff", dark: "#6638bb" },
  { name: "香芋紫", base: "#cfa8ee", light: "#eedaff", dark: "#9a6fc4" },
  { name: "宝蓝",   base: "#4a6ce0", light: "#8fa6ff", dark: "#2a41a0" },
  { name: "天空蓝", base: "#7ec8f5", light: "#c8ecff", dark: "#4491c4" },
  { name: "湖水绿", base: "#5fd0b8", light: "#aef2e2", dark: "#2f9a85" },
  { name: "草绿",   base: "#7ec850", light: "#c0f29a", dark: "#4f9422" },
  { name: "幻彩AB", base: "#e8c8f8", light: "#ffffff", dark: "#8f9df0", ab: true },
];
const AB_RAINBOW = ["#ff9a9e", "#ffd98a", "#a8f2a0", "#8fd8ff", "#b0a0ff", "#f0a0e8"];

/* ============ 脉络模板(数学生成,对称精确) ============ */
const N = 28; // 网格边长
const EMPTY = 0, BLOCK = -1;

function makeMask(fn) {
  const m = [];
  for (let y = 0; y < N; y++) {
    const row = [];
    for (let x = 0; x < N; x++) {
      // 归一化到 [-1,1],y 向上
      const nx = (x + 0.5) / N * 2 - 1;
      const ny = 1 - (y + 0.5) / N * 2;
      row.push(fn(nx, ny) ? EMPTY : BLOCK);
    }
    m.push(row);
  }
  return m;
}

function heartMask() {
  return makeMask((x, y) => {
    const a = x * 1.25, b = y * 1.25 + 0.12;
    const t = a * a + b * b - 1;
    return t * t * t - a * a * b * b * b <= 0;
  });
}

function starMask() { // 五角星
  const R = 0.95, r = R * 0.42;
  return makeMask((x, y) => {
    const len = Math.hypot(x, y);
    if (len > R) return false;
    let th = Math.atan2(y, x) + Math.PI / 2; // 顶点朝上
    th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const seg = (2 * Math.PI) / 5;
    const local = th % seg;
    const mid = seg / 2;
    const rad = local < mid
      ? r + (R - r) * (local / mid)
      : R - (R - r) * ((local - mid) / mid);
    return len <= rad;
  });
}

function mandalaMask() { // 曼陀罗:外环 + 8 瓣 + 花芯
  return makeMask((x, y) => {
    const len = Math.hypot(x, y);
    if (len > 0.98) return false;
    const th = Math.atan2(y, x);
    const petal = 0.62 + 0.3 * Math.cos(8 * th);
    if (len <= 0.24) return true;                 // 花芯
    if (len >= 0.88) return true;                 // 外环
    return len <= petal;                          // 花瓣
  });
}

function moonStarMask() { // 星月
  return makeMask((x, y) => {
    // 月牙:大圆挖掉右上偏移圆
    const inBig = Math.hypot(x + 0.18, y + 0.05) <= 0.72;
    const inCut = Math.hypot(x + 0.52, y + 0.32) <= 0.60;
    if (inBig && !inCut) return true;
    // 小星星(右上):迷你五角星
    const sx = x - 0.48, sy = y - 0.48;
    const len = Math.hypot(sx, sy);
    if (len > 0.30) return false;
    let th = Math.atan2(sy, sx) + Math.PI / 2;
    th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const seg = (2 * Math.PI) / 5, mid = seg / 2;
    const R2 = 0.30, r2 = 0.13;
    const local = th % seg;
    const rad = local < mid ? r2 + (R2 - r2) * (local / mid)
                            : R2 - (R2 - r2) * ((local - mid) / mid);
    return len <= rad;
  });
}

function roseMask() { // 四瓣玫瑰
  return makeMask((x, y) => {
    const len = Math.hypot(x, y);
    if (len > 0.97) return false;
    const th = Math.atan2(y, x);
    const petal = 0.95 * Math.abs(Math.cos(2 * th));
    if (len <= 0.10) return true;
    return len <= petal;
  });
}

function lotusMask() { // 八瓣莲花
  return makeMask((x, y) => {
    const len = Math.hypot(x, y);
    if (len > 0.97) return false;
    const th = Math.atan2(y, x);
    const petal = 0.9 * Math.abs(Math.cos(4 * th));
    return len <= 0.12 || len <= petal;
  });
}

function sunMask() { // 太阳:中心圆 + 12 道三角光芒
  return makeMask((x, y) => {
    const len = Math.hypot(x, y);
    if (len <= 0.42) return true;
    if (len > 0.92) return false;
    let th = Math.atan2(y, x);
    th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const seg = (2 * Math.PI) / 12, mid = seg / 2;
    const local = th % seg;
    const w = 1 - Math.abs(local - mid) / mid; // 段中央最宽
    return len <= 0.42 + 0.5 * w * w;
  });
}

function snowflakeMask() { // 雪花:6 辐条 + 中心 + 末端菱形头
  return makeMask((x, y) => {
    const len = Math.hypot(x, y);
    if (len > 0.96) return false;
    if (len <= 0.22) return true;
    let th = Math.atan2(y, x);
    th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const seg = (2 * Math.PI) / 6, mid = seg / 2;
    const local = th % seg;
    const w = Math.abs(local - mid) / mid; // 0=条中央 1=条边缘
    if (len <= 0.78 && w <= 0.30) return true;       // 辐条
    if (len > 0.78 && w <= 0.55 - (len - 0.78) * 1.6) return true; // 末端收尖
    return false;
  });
}

function cloverMask() { // 四叶草:四个圆叶
  return makeMask((x, y) => {
    const cs = [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]];
    for (const [cx, cy] of cs) {
      if (Math.hypot(x - cx, y - cy) <= 0.37) return true;
    }
    return Math.hypot(x, y) <= 0.16;
  });
}

function gemMask() { // 钻石切割形
  return makeMask((x, y) => {
    if (Math.abs(y) > 0.9) return false;
    if (y < -0.6) return Math.abs(x) <= 0.45;
    if (y < -0.15) return Math.abs(x) <= 0.45 + (y + 0.6) / 0.45 * 0.35;
    return Math.abs(x) <= 0.8 * (1 - (y + 0.15) / 1.05);
  });
}

function kaleidoMask() { // 万花筒:12 瓣细密
  return makeMask((x, y) => {
    const len = Math.hypot(x, y);
    if (len > 0.96) return false;
    const th = Math.atan2(y, x);
    return len <= 0.4 + 0.52 * Math.abs(Math.cos(6 * th));
  });
}

function rainbowMask() { // 彩虹拱带
  return makeMask((x, y) => {
    const len = Math.hypot(x, y);
    return y >= -0.08 && len >= 0.52 && len <= 0.95;
  });
}

function wreathMask() { // 花环:圆环 + 12 朵花瓣圆
  return makeMask((x, y) => {
    const len = Math.hypot(x, y);
    if (len >= 0.62 && len <= 0.94) return true;
    const th = Math.atan2(y, x);
    const seg = (2 * Math.PI) / 12;
    const a = Math.round(th / seg) * seg;
    return Math.hypot(x - 0.78 * Math.cos(a), y - 0.78 * Math.sin(a)) <= 0.17;
  });
}

function evilEyeMask() { // 恶魔之眼:同心圆盘(配色留给玩家创作)
  return makeMask((x, y) => Math.hypot(x, y) <= 0.92);
}

const TEMPLATES = [
  { name: "💎 爱心", gen: heartMask },
  { name: "⭐ 星星", gen: starMask },
  { name: "🌸 曼陀罗", gen: mandalaMask },
  { name: "🌙 星月", gen: moonStarMask },
  { name: "🌹 玫瑰", gen: roseMask },
  { name: "🪷 莲花", gen: lotusMask },
  { name: "☀️ 太阳", gen: sunMask },
  { name: "❄️ 雪花", gen: snowflakeMask },
  { name: "🍀 四叶草", gen: cloverMask },
  { name: "💎 宝石", gen: gemMask },
  { name: "🔮 万花筒", gen: kaleidoMask },
  { name: "🌈 彩虹", gen: rainbowMask },
  { name: "🌼 花环", gen: wreathMask },
  { name: "🧿 恶魔之眼", gen: evilEyeMask },
];

/* ============ 状态 ============ */
const S = {
  grid: null,
  total: 0,
  placed: 0,
  color: 1,            // 当前色板索引
  eraseMode: false,
  sound: true,
  completed: false,
  undoStack: [],
  sparkles: [],        // 每格闪烁相位
  sweep: -1,           // 扫光进度 0..1,-1 不活跃
  tplIndex: 0,
};

/* ============ DOM ============ */
const $ = (s) => document.querySelector(s);
const board = $("#board");
const ctx = board.getContext("2d");
let cell = 20, ox = 0, oy = 0, dpr = 1;

/* ============ 音效(WebAudio 合成,无外部素材) ============ */
let AC = null;
function audio() {
  if (!S.sound) return null;
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === "suspended") AC.resume();
  return AC;
}
function sfxPlace() {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime;
  const f = 2100 + Math.random() * 700;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "triangle"; o.frequency.value = f;
  g.gain.setValueAtTime(0.14, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  o.connect(g).connect(ac.destination);
  o.start(t); o.stop(t + 0.08);
  const o2 = ac.createOscillator(), g2 = ac.createGain();
  o2.type = "sine"; o2.frequency.value = f * 2.7;
  g2.gain.setValueAtTime(0.05, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  o2.connect(g2).connect(ac.destination);
  o2.start(t); o2.stop(t + 0.05);
}
function sfxErase() {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(500, t);
  o.frequency.exponentialRampToValueAtTime(220, t + 0.08);
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  o.connect(g).connect(ac.destination);
  o.start(t); o.stop(t + 0.1);
}
function sfxDone() {
  const ac = audio(); if (!ac) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    const t = ac.currentTime + i * 0.12;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + 0.55);
  });
}
function buzz(ms) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {}
}

/* ============ 模板加载 ============ */
function loadTemplate(idx) {
  S.tplIndex = idx;
  S.grid = TEMPLATES[idx].gen();
  S.total = 0; S.placed = 0;
  S.sparkles = [];
  S.completed = false;
  S.undoStack = [];
  S.sweep = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (S.grid[y][x] !== BLOCK) S.total++;
      S.sparkles.push(Math.random());
    }
  }
  document.querySelectorAll(".tpl-chip").forEach((c, i) =>
    c.classList.toggle("active", i === idx));
  hideDone();
  updateProgress();
  draw(performance.now());
}

/* ============ 渲染 ============ */
function resize() {
  const stage = $("#stage");
  const size = Math.min(stage.clientWidth - 8, stage.clientHeight - 8);
  dpr = window.devicePixelRatio || 1;
  board.style.width = size + "px";
  board.style.height = size + "px";
  board.width = size * dpr;
  board.height = size * dpr;
  cell = size / N;
  draw(performance.now());
}

function drawGem(c2, cx, cy, r, gi, alpha = 1) {
  const g = GEMS[gi];
  c2.globalAlpha = alpha;
  // 主体:径向渐变,亮心偏左上
  const grad = c2.createRadialGradient(cx - r * 0.32, cy - r * 0.38, r * 0.1, cx, cy, r * 1.05);
  if (g.ab) {
    const lg = c2.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    AB_RAINBOW.forEach((col, i) => lg.addColorStop(i / (AB_RAINBOW.length - 1), col));
    c2.fillStyle = lg;
  } else {
    grad.addColorStop(0, g.light);
    grad.addColorStop(0.45, g.base);
    grad.addColorStop(1, g.dark);
    c2.fillStyle = grad;
  }
  c2.beginPath();
  c2.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
  c2.fill();
  // 底缘暗描边
  c2.strokeStyle = "rgba(0,0,0,0.28)";
  c2.lineWidth = Math.max(1, r * 0.08);
  c2.beginPath();
  c2.arc(cx, cy, r * 0.93, Math.PI * 0.1, Math.PI * 0.9);
  c2.stroke();
  // 固定高光点
  c2.fillStyle = "rgba(255,255,255,0.9)";
  c2.beginPath();
  c2.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.16, r * 0.1, -0.6, 0, Math.PI * 2);
  c2.fill();
  c2.globalAlpha = 1;
}

function drawSparkle(c2, cx, cy, r, t0, now, phase) {
  const T = 3800; // 闪周期 ms
  const p = ((now - t0) / T + phase) % 1;
  if (p > 0.10) return;
  const k = Math.sin((p / 0.10) * Math.PI); // 0→1→0
  const len = r * 1.5 * k;
  c2.save();
  c2.globalAlpha = k * 0.95;
  c2.strokeStyle = "#ffffff";
  c2.lineCap = "round";
  c2.lineWidth = Math.max(1, r * 0.14);
  c2.beginPath();
  c2.moveTo(cx - len, cy); c2.lineTo(cx + len, cy);
  c2.moveTo(cx, cy - len); c2.lineTo(cx, cy + len);
  c2.stroke();
  c2.globalAlpha = k * 0.5;
  c2.beginPath();
  const d = len * 0.5;
  c2.moveTo(cx - d, cy - d); c2.lineTo(cx + d, cy + d);
  c2.moveTo(cx + d, cy - d); c2.lineTo(cx - d, cy + d);
  c2.stroke();
  c2.restore();
}

function draw(now) {
  if (!S.grid) return;
  const W = board.width;
  ctx.clearRect(0, 0, W, W);
  // 面板底
  const bg = ctx.createLinearGradient(0, 0, W, W);
  bg.addColorStop(0, "#1a1628");
  bg.addColorStop(1, "#201a34");
  ctx.fillStyle = bg;
  // 圆角底板
  const r0 = 18 * dpr;
  ctx.beginPath();
  ctx.moveTo(r0, 0);
  ctx.arcTo(W, 0, W, W, r0);
  ctx.arcTo(W, W, 0, W, r0);
  ctx.arcTo(0, W, 0, 0, r0);
  ctx.arcTo(0, 0, W, 0, r0);
  ctx.fill();

  const c = cell * dpr;
  const idx = (x, y) => y * N + x;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = S.grid[y][x];
      if (v === BLOCK) continue;
      const cx = (x + 0.5) * c, cy = (y + 0.5) * c;
      if (v === EMPTY) {
        // 等待贴钻的凹点
        ctx.fillStyle = "rgba(255,255,255,0.055)";
        ctx.beginPath();
        ctx.arc(cx, cy, c * 0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      } else {
        drawGem(ctx, cx, cy, c * 0.48, v - 1);
        drawSparkle(ctx, cx, cy, c * 0.48, 0, now, S.sparkles[idx(x, y)]);
      }
    }
  }
  // 完成扫光
  if (S.sweep >= 0 && S.sweep <= 1) {
    const t = S.sweep;
    ctx.save();
    ctx.globalAlpha = 0.5 * Math.sin(t * Math.PI);
    ctx.translate(W * t * 1.4 - W * 0.2, 0);
    ctx.rotate(0.35);
    const sw = W * 0.28;
    const lg = ctx.createLinearGradient(-sw, 0, sw, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)");
    lg.addColorStop(0.5, "rgba(255,255,255,0.85)");
    lg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(-sw, -W, sw * 2, W * 3);
    ctx.restore();
  }
  requestAnimationFrame(draw);
}

/* ============ 进度与完成 ============ */
function updateProgress() {
  const pct = S.total ? Math.round(S.placed / S.total * 100) : 0;
  $("#progress-bar").style.width = pct + "%";
  $("#progress-text").textContent = S.placed + " / " + S.total + " · " + pct + "%";
}

function checkComplete() {
  if (S.placed === S.total && !S.completed) {
    S.completed = true;
    sfxDone();
    buzz([30, 60, 30, 60, 80]);
    // 闪白 + 扫光
    const fl = $("#flash");
    fl.style.transition = "none";
    fl.style.opacity = "0.95";
    requestAnimationFrame(() => {
      fl.style.transition = "opacity 0.7s ease";
      fl.style.opacity = "0";
    });
    const t0 = performance.now();
    const anim = () => {
      const t = (performance.now() - t0) / 1200;
      S.sweep = t;
      if (t <= 1) requestAnimationFrame(anim);
      else S.sweep = -1;
    };
    anim();
    setTimeout(showDone, 900);
  }
}

function showDone() {
  const card = $("#done-card");
  card.classList.remove("hidden");
  requestAnimationFrame(() => card.classList.add("show"));
  $("#done-sub").textContent =
    TEMPLATES[S.tplIndex].name.replace(/^\S+\s/, "") + " · " + S.total + " 颗钻";
}
function hideDone() {
  const card = $("#done-card");
  card.classList.remove("show");
  setTimeout(() => card.classList.add("hidden"), 350);
}

/* ============ 交互 ============ */
let stroke = null; // 当前一笔的变更记录

function cellAt(ev) {
  const rect = board.getBoundingClientRect();
  const px = (ev.clientX - rect.left) / rect.width * N;
  const py = (ev.clientY - rect.top) / rect.height * N;
  const x = Math.floor(px), y = Math.floor(py);
  if (x < 0 || y < 0 || x >= N || y >= N) return null;
  return { x, y };
}

function applyCell(x, y) {
  const v = S.grid[y][x];
  if (S.eraseMode) {
    if (v !== EMPTY && v !== BLOCK) {
      stroke.push({ x, y, prev: v, next: EMPTY });
      S.grid[y][x] = EMPTY;
      S.placed--;
      sfxErase(); buzz(6);
    }
  } else {
    if (v !== BLOCK && v !== S.color + 1) {
      stroke.push({ x, y, prev: v, next: S.color + 1 });
      if (v === EMPTY) S.placed++;
      S.grid[y][x] = S.color + 1;
      sfxPlace(); buzz(8);
    }
  }
}

board.addEventListener("pointerdown", (ev) => {
  ev.preventDefault();
  const p = cellAt(ev);
  if (!p) return;
  audio();
  board.setPointerCapture(ev.pointerId);
  stroke = [];
  applyCell(p.x, p.y);
  updateProgress();
});
board.addEventListener("pointermove", (ev) => {
  if (!stroke) return;
  ev.preventDefault();
  const p = cellAt(ev);
  if (p) applyCell(p.x, p.y);
});
const endStroke = () => {
  if (stroke && stroke.length) {
    S.undoStack.push(stroke);
    if (S.undoStack.length > 300) S.undoStack.shift();
    checkComplete();
  }
  stroke = null;
  updateProgress();
};
board.addEventListener("pointerup", endStroke);
board.addEventListener("pointercancel", endStroke);

function undo() {
  const s = S.undoStack.pop();
  if (!s) return;
  for (let i = s.length - 1; i >= 0; i--) {
    const u = s[i];
    if (S.grid[u.y][u.x] === EMPTY && u.prev !== EMPTY) S.placed++;
    if (S.grid[u.y][u.x] !== EMPTY && u.next === EMPTY) S.placed--;
    S.grid[u.y][u.x] = u.prev;
  }
  S.completed = false;
  hideDone();
  updateProgress();
  sfxErase();
}

/* ============ 导出 ============ */
function exportPNG() {
  const scale = 32; // 28*32 = 896px,接近壁纸级
  const off = document.createElement("canvas");
  off.width = off.height = N * scale;
  const c2 = off.getContext("2d");
  const bg = c2.createLinearGradient(0, 0, off.width, off.height);
  bg.addColorStop(0, "#1a1628");
  bg.addColorStop(1, "#201a34");
  c2.fillStyle = bg;
  c2.fillRect(0, 0, off.width, off.height);
  const c = scale;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = S.grid[y][x];
      if (v > 0) drawGem(c2, (x + 0.5) * c, (y + 0.5) * c, c * 0.48, v - 1);
    }
  }
  // 轻水印
  c2.font = "500 " + Math.round(off.width * 0.032) + "px sans-serif";
  c2.fillStyle = "rgba(255,255,255,0.5)";
  c2.textAlign = "right";
  c2.textBaseline = "bottom";
  c2.fillText("💎 Diamond Collage", off.width - off.width * 0.03, off.height - off.width * 0.025);
  off.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "钻石拼贴-" + TEMPLATES[S.tplIndex].name.replace(/^\S+\s/, "") + ".png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }, "image/png");
}

/* ============ UI 组装 ============ */
function buildTemplates() {
  const nav = $("#templates");
  TEMPLATES.forEach((t, i) => {
    const b = document.createElement("button");
    b.className = "tpl-chip";
    b.textContent = t.name;
    b.addEventListener("click", () => loadTemplate(i));
    nav.appendChild(b);
  });
}

function gemSwatchCanvas(gi, size) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  drawGem(cv.getContext("2d"), size / 2, size / 2, size * 0.46, gi);
  return cv;
}

function buildPalette() {
  const pal = $("#palette");
  GEMS.forEach((g, i) => {
    const d = document.createElement("div");
    d.className = "gem-swatch" + (i === S.color ? " active" : "");
    d.title = g.name;
    d.appendChild(gemSwatchCanvas(i, 44));
    d.addEventListener("click", () => {
      S.color = i;
      S.eraseMode = false;
      $("#btn-erase").classList.remove("on");
      document.querySelectorAll(".gem-swatch").forEach((s, j) =>
        s.classList.toggle("active", j === i));
      buzz(5);
    });
    pal.appendChild(d);
  });
}

function buildTools() {
  $("#btn-undo").addEventListener("click", undo);
  $("#btn-erase").addEventListener("click", () => {
    S.eraseMode = !S.eraseMode;
    $("#btn-erase").classList.toggle("on", S.eraseMode);
    buzz(5);
  });
  $("#btn-sound").addEventListener("click", () => {
    S.sound = !S.sound;
    $("#btn-sound").textContent = S.sound ? "🔊" : "🔇";
  });
  $("#btn-export").addEventListener("click", () => { exportPNG(); hideDone(); });
  $("#btn-export2").addEventListener("click", exportPNG);
  $("#btn-continue").addEventListener("click", hideDone);
}

/* ============ 启动 ============ */
function init() {
  // 进度条轨道背景
  const wrap = $("#progress-wrap");
  const track = document.createElement("div");
  track.className = "track-bg";
  wrap.insertBefore(track, $("#progress-bar"));
  buildTemplates();
  buildPalette();
  buildTools();
  loadTemplate(0);
  resize();
  window.addEventListener("resize", resize);
}
init();
