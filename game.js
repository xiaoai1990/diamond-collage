/* Diamond Collage v2 · Y2K 界面 + 真实素材贴图 + 模板密铺
 * 模板:templates/*.json(spots 点位) | 素材:gems/*.png(228 颗,manifest 分包)
 * 交互:点空位贴钻 / 滑动连贴 / 点已贴换钻 / 擦除 / 撤销;完成揭晓;导出 PNG
 */
"use strict";

/* ---------- 状态 ---------- */
const S = {
  mode: "template",        // template | free
  tplId: null,
  spots: [],               // {x,y,r,tier,gem:file|null,phase}
  placed: 0,
  total: 0,
  pack: "purple",
  shape: null,             // null = 包内随机;file = 锁定形状
  erase: false,
  sound: true,
  undoStack: [],
  completed: false,
  sweep: -1,
  gemImgs: new Map(),      // file -> Image
  manifest: null,
  freeCount: 0,
};
const PXS = 4;             // 逻辑画布边距
const CV = 360;

/* ---------- DOM ---------- */
const $ = s => document.querySelector(s);
const board = $("#board");
const ctx = board.getContext("2d");

/* ---------- 音效(WebAudio 合成) ---------- */
let AC = null;
function audio() {
  if (!S.sound) return null;
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === "suspended") AC.resume();
  return AC;
}
function tone(f, t0, dur, vol, type) {
  const ac = AC; if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function sfxPlace() {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime, f = 2100 + Math.random() * 700;
  tone(f, t, 0.07, 0.14, "triangle");
  tone(f * 2.7, t, 0.04, 0.05, "sine");
}
function sfxErase() {
  const ac = audio(); if (!ac) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(500, t);
  o.frequency.exponentialRampToValueAtTime(220, t + 0.08);
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.1);
}
function sfxDone() {
  const ac = audio(); if (!ac) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, ac.currentTime + i * 0.12, 0.5, 0.16, "triangle"));
}
function buzz(v) { try { navigator.vibrate && navigator.vibrate(v); } catch (e) {} }

/* ---------- 素材与清单 ---------- */
async function loadManifest() {
  const r = await fetch("gems-manifest.json");
  S.manifest = await r.json();
}
function packFiles(pack) { return S.manifest.packs[pack] || []; }
function imgOf(file) { return S.gemImgs.get(file); }
function preload(files, onprog) {
  return Promise.all(files.map(f => new Promise(res => {
    if (S.gemImgs.has(f)) return res();
    const im = new Image();
    im.onload = () => { S.gemImgs.set(f, im); res(); };
    im.onerror = res;
    im.src = "gems/" + f;
    if (im.complete) res();
  })));
}
function pickGem() {
  const files = packFiles(S.pack);
  if (S.shape) return S.shape;
  return files[Math.floor(Math.random() * files.length)];
}

/* ---------- 模板加载 ---------- */
async function loadTemplate(id) {
  const r = await fetch("templates/" + id + ".json");
  const tpl = await r.json();
  S.mode = "template";
  S.tplId = id;
  S.spots = tpl.spots.map(s => ({ x: s.x, y: s.y, r: s.r, tier: s.tier, gem: null, phase: Math.random() }));
  S.total = S.spots.length; S.placed = 0;
  S.undoStack = []; S.completed = false; S.freeCount = 0;
  S.pack = packForHint(tpl.colorHint);
  S.shape = null;
  $("#play-title").textContent = "← " + id + "_collage.exe";
  $("#art-name").textContent = id + ".png";
  $("#free-tag").classList.add("hidden");
  $("#progress-area").classList.remove("hidden");
  renderPicker();
  updateProgress();
}

function packForHint(hint) {
  const map = { red: "red", pink: "pink", magenta: "pink", blue: "blue", sky: "blue", green: "green", lime: "green", purple: "purple", lavender: "purple", gold: "gold", yellow: "gold", silver: "silver", white: "silver", orange: "gold", peach: "pink" };
  return map[hint] || "purple";
}

/* ---------- 自由模式 ---------- */
function startFree() {
  S.mode = "free";
  S.tplId = null;
  S.spots = []; S.total = 0; S.placed = 0;
  S.undoStack = []; S.completed = false; S.freeCount = 0;
  $("#play-title").textContent = "← free_play.exe";
  $("#art-name").textContent = "untitled.png";
  $("#free-tag").classList.remove("hidden");
  $("#progress-area").classList.add("hidden");
  renderPicker();
}

/* ---------- 渲染 ---------- */
let dpr = 1, scale = 1, offx = 0, offy = 0, cssSize = 300;

function resize() {
  const holder = board.parentElement;
  cssSize = Math.min(holder.clientWidth, holder.clientHeight) - 4;
  if (cssSize < 120) cssSize = 120;
  dpr = window.devicePixelRatio || 1;
  board.style.width = cssSize + "px";
  board.style.height = cssSize + "px";
  board.width = cssSize * dpr;
  board.height = cssSize * dpr;
  scale = (cssSize * dpr) / (CV + PXS * 2);
  offx = offy = PXS * scale;
  draw(performance.now());
}

function drawGemImg(file, cx, cy, d) {
  const im = imgOf(file);
  if (!im) return;
  ctx.drawImage(im, cx - d / 2, cy - d / 2, d, d);
}

function drawSparkle(cx, cy, r, now, phase) {
  const T = 3800;
  const p = ((now / T) + phase) % 1;
  if (p > 0.10) return;
  const k = Math.sin((p / 0.10) * Math.PI);
  const len = r * 1.4 * k;
  ctx.save();
  ctx.globalAlpha = k * 0.9;
  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, r * 0.13);
  ctx.beginPath();
  ctx.moveTo(cx - len, cy); ctx.lineTo(cx + len, cy);
  ctx.moveTo(cx, cy - len); ctx.lineTo(cx, cy + len);
  ctx.stroke();
  ctx.restore();
}

function draw(now) {
  if (!board.width) { requestAnimationFrame(draw); return; }
  ctx.clearRect(0, 0, board.width, board.height);
  // 画纸底
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, board.width, board.height);
  const t0 = 0;
  for (const s of S.spots) {
    const cx = offx + s.x * scale, cy = offy + s.y * scale, rr = s.r * scale;
    if (s.gem) {
      drawGemImg(s.gem, cx, cy, rr * 2.05);
      drawSparkle(cx, cy, rr, now, s.phase);
    } else {
      ctx.fillStyle = "rgba(163,120,220,0.08)";
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(162,89,247,0.75)";
      ctx.lineWidth = 1.4 * dpr;
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // 完成扫光
  if (S.sweep >= 0 && S.sweep <= 1) {
    const t = S.sweep, W = board.width;
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

/* ---------- 进度 / 完成 ---------- */
function updateProgress() {
  if (S.mode !== "template") return;
  const pct = S.total ? S.placed / S.total : 0;
  const segs = document.querySelectorAll("#seg-track .seg");
  segs.forEach((el, i) => el.classList.toggle("on", pct * 10 >= i + 0.5));
  $("#prog-gems").textContent = S.placed + " / " + S.total + " gems";
  $("#prog-pct").textContent = Math.round(pct * 100) + "% done!";
}
function checkComplete() {
  if (S.mode === "template" && S.placed === S.total && !S.completed) {
    S.completed = true;
    sfxDone(); buzz([30, 60, 30, 60, 80]);
    const fl = $("#flash");
    fl.style.transition = "none"; fl.style.opacity = "0.95";
    requestAnimationFrame(() => { fl.style.transition = "opacity 0.7s ease"; fl.style.opacity = "0"; });
    const t0 = performance.now();
    (function anim() {
      const t = (performance.now() - t0) / 1200;
      S.sweep = t;
      if (t <= 1) requestAnimationFrame(anim); else S.sweep = -1;
    })();
    setTimeout(showDone, 900);
  }
}
function showDone() {
  $("#done-sub").textContent = S.total + " gems · your own colors ♡";
  $("#done-card").classList.remove("hidden");
}
function hideDone() { $("#done-card").classList.add("hidden"); }

/* ---------- 交互 ---------- */
let stroke = null;
function hitSpot(px, py) {  // px,py: 0-360 逻辑坐标
  let best = null, bd = 1e9;
  for (const s of S.spots) {
    const d = Math.hypot(s.x - px, s.y - py);
    if (d < Math.max(s.r + 6, 16) && d < bd) { bd = d; best = s; }
  }
  return best;
}
function applySpot(s) {
  if (S.erase) {
    if (s.gem) {
      stroke.push({ s, prev: s.gem });
      s.gem = null; S.placed--;
      sfxErase(); buzz(6);
    }
  } else {
    const g = pickGem();
    if (s.gem !== g) {
      stroke.push({ s, prev: s.gem });
      if (!s.gem) S.placed++;
      s.gem = g;
      sfxPlace(); buzz(8);
    }
  }
}
function toLogic(ev) {
  const rect = board.getBoundingClientRect();
  return {
    x: (ev.clientX - rect.left) / rect.width * (CV + PXS * 2) - PXS,
    y: (ev.clientY - rect.top) / rect.height * (CV + PXS * 2) - PXS,
  };
}
board.addEventListener("pointerdown", ev => {
  ev.preventDefault(); audio();
  const p = toLogic(ev);
  lastPt = null;
  stroke = [];
  if (S.mode === "free") {
    // 自由:空处创建新点,松吸附
    const near = S.spots.find(s => Math.hypot(s.x - p.x, s.y - p.y) < s.r * 0.9 && s.gem);
    let x = p.x, y = p.y;
    if (near) {
      const a = Math.random() * Math.PI * 2;
      x = near.x + Math.cos(a) * near.r * 1.7;
      y = near.y + Math.sin(a) * near.r * 1.7;
    }
    const s = { x: Math.round(x), y: Math.round(y), r: 26, tier: "L", gem: null, phase: Math.random() };
    S.spots.push(s); S.total++; S.freeCount++;
    applySpot(s);
  } else {
    const s = hitSpot(p.x, p.y);
    if (!s) { stroke = null; return; }
    applySpot(s);
  }
  board.setPointerCapture(ev.pointerId);
  updateProgress();
});
let lastPt = null;
board.addEventListener("pointermove", ev => {
  if (!stroke) return;
  ev.preventDefault();
  const p = toLogic(ev);
  if (lastPt && Math.hypot(p.x - lastPt.x, p.y - lastPt.y) < 14) return;
  let s = null;
  if (S.mode === "free") {
    s = hitSpot(p.x, p.y);
    if (!s && !S.erase) {
      s = { x: Math.round(p.x), y: Math.round(p.y), r: 26, tier: "L", gem: null, phase: Math.random() };
      S.spots.push(s); S.total++; S.freeCount++;
    }
  } else {
    s = hitSpot(p.x, p.y);
  }
  if (s) { applySpot(s); lastPt = p; }
});
const endStroke = () => {
  if (stroke && stroke.length) {
    S.undoStack.push(stroke);
    if (S.undoStack.length > 300) S.undoStack.shift();
  }
  stroke = null;
  updateProgress();
  checkComplete();
};
board.addEventListener("pointerup", endStroke);
board.addEventListener("pointercancel", endStroke);

function undo() {
  const st = S.undoStack.pop();
  if (!st) return;
  for (let i = st.length - 1; i >= 0; i--) {
    const u = st[i];
    if (u.prev) S.placed++;
    if (!u.prev && u.s.gem) S.placed--;
    u.s.gem = u.prev;
  }
  S.completed = false; hideDone();
  updateProgress(); sfxErase();
}

/* ---------- 导出 ---------- */
function exportPNG() {
  const scale = 3;
  const off = document.createElement("canvas");
  off.width = off.height = (CV + PXS * 2) * scale;
  const c2 = off.getContext("2d");
  c2.scale(scale, scale);
  c2.translate(PXS, PXS);
  c2.fillStyle = "#FFFFFF";
  c2.fillRect(-PXS, -PXS, CV + PXS * 2, CV + PXS * 2);
  for (const s of S.spots) {
    if (s.gem) {
      const im = imgOf(s.gem);
      if (im) c2.drawImage(im, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    }
  }
  c2.font = "600 14px Fredoka, sans-serif";
  c2.fillStyle = "rgba(90,74,110,0.55)";
  c2.textAlign = "right";
  c2.fillText("💎 Diamond Collage", CV - 8, CV - 10);
  off.toBlob(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "diamond-collage-" + (S.tplId || "free") + ".png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }, "image/png");
}

/* ---------- UI 组装 ---------- */
async function buildHome() {
  const r = await fetch("templates/index.json");
  const list = await r.json();
  const grid = $("#card-grid");
  for (const t of list) {
    const card = document.createElement("div");
    card.className = "wincard";
    card.innerHTML = `<div class="cbar"><span>· · ·</span><span>×</span></div>`;
    const cv = document.createElement("canvas");
    cv.width = 240; cv.height = 240;
    card.appendChild(cv);
    const info = document.createElement("div");
    info.className = "cinfo";
    info.innerHTML = `<span class="cname">${t.name}</span><span class="cstat">new!</span>`;
    card.appendChild(info);
    card.addEventListener("click", () => enterPlay(t.id));
    grid.appendChild(card);
    // 画 spots 缩略
    const tr = await fetch("templates/" + t.id + ".json");
    const tpl = await tr.json();
    const c2 = cv.getContext("2d");
    c2.fillStyle = "#F6EFFF"; c2.fillRect(0, 0, 240, 240);
    for (const s of tpl.spots) {
      c2.strokeStyle = s.tier === "L" ? "#B57EE8" : s.tier === "M" ? "#F083BE" : "#78C8F0";
      c2.lineWidth = 3;
      c2.beginPath(); c2.arc(s.x / 360 * 240, s.y / 360 * 240, s.r / 360 * 240, 0, Math.PI * 2); c2.stroke();
    }
  }
}
function enterPlay(tplId) {
  $("#view-home").classList.add("hidden");
  $("#view-play").classList.remove("hidden");
  loadTemplate(tplId).then(resize);
}
function backHome() {
  $("#view-play").classList.add("hidden");
  $("#view-home").classList.remove("hidden");
  resize();
}
function showFree() {
  $("#view-home").classList.add("hidden");
  $("#view-play").classList.remove("hidden");
  startFree();
  resize();
}

function renderPicker() {
  // 形状托盘(上)+ 色系包(下)
  const shapeRow = $("#shape-row");
  shapeRow.innerHTML = "";
  const files = packFiles(S.pack);
  const mkSlot = (file, active, title, onclick) => {
    const d = document.createElement("div");
    d.className = "gem-slot" + (active ? " active" : "");
    d.title = title;
    if (file) {
      const im = document.createElement("img");
      im.src = "gems/" + file; d.appendChild(im);
    } else {
      d.textContent = "🎲"; d.style.fontSize = "20px";
    }
    d.addEventListener("click", () => { onclick(); renderPicker(); buzz(5); });
    shapeRow.appendChild(d);
  };
  mkSlot(null, !S.shape, "random from pack ✦", () => { S.shape = null; });
  files.slice(0, 6).forEach(f => {
    mkSlot(f, S.shape === f, f, () => { S.shape = (S.shape === f ? null : f); });
  });
  const packRow = $("#pack-row");
  packRow.innerHTML = "";
  for (const pk of Object.keys(S.manifest.packs)) {
    const d = document.createElement("div");
    d.className = "gem-slot" + (S.pack === pk ? " active" : "");
    const sample = S.manifest.packs[pk][0];
    const im = document.createElement("img");
    im.src = "gems/" + sample; d.appendChild(im);
    d.title = pk + " pack";
    d.addEventListener("click", () => {
      S.pack = pk; S.shape = null;
      preload(packFiles(pk));
      renderPicker(); buzz(5);
    });
    packRow.appendChild(d);
  }
}

/* ---------- 任务栏时钟 ---------- */
function tickClock() {
  const d = new Date();
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  $("#clock").textContent = h + ":" + m + " " + ap;
  setTimeout(tickClock, 30000);
}

/* ---------- 启动 ---------- */
async function init() {
  // 分段进度条
  const seg = $("#seg-track");
  for (let i = 0; i < 10; i++) {
    const d = document.createElement("div");
    d.className = "seg"; seg.appendChild(d);
  }
  await loadManifest();
  // 预加载全部素材(显示在任务栏)
  const all = S.manifest.gems.map(g => g.file);
  preload(all);
  await buildHome();
  // 事件
  $("#tab-frames").addEventListener("click", () => {});
  $("#tab-free").addEventListener("click", showFree);
  $("#play-title").addEventListener("click", backHome);
  $("#btn-undo").addEventListener("click", undo);
  $("#btn-erase").addEventListener("click", () => {
    S.erase = !S.erase;
    $("#btn-erase").classList.toggle("on", S.erase);
    buzz(5);
  });
  $("#btn-sound").addEventListener("click", () => {
    S.sound = !S.sound;
    $("#btn-sound").querySelector(".ticon").textContent = S.sound ? "🔊" : "🔇";
  });
  $("#btn-export").addEventListener("click", () => { exportPNG(); hideDone(); });
  $("#btn-export2").addEventListener("click", exportPNG);
  $("#btn-continue").addEventListener("click", hideDone);
  tickClock();
  resize();
  requestAnimationFrame(draw);
}
init();
