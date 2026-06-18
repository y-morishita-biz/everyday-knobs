import * as THREE from "./three.module.min.js";

/* ============================================================
   everyday knobs — LP runtime
   - パラメータSVGグリフ（アプリと同系の意匠）
   - テーマ / アクセント切替（localStorage でアプリと共有）
   - ヒーロー：実3Dノブ（斜め上ビュー・自動回転）
   ============================================================ */

const A = "var(--accent)";
const root = document.documentElement;

/* ---------- SVG glyphs (アプリの作例サムネと同系) ---------- */
let _uid = 0;
const pt = (r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
};
const ln = (x1, y1, x2, y2, sw = 1.4) =>
  `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${A}" stroke-width="${sw}" stroke-linecap="round"/>`;
const ci = (r, sw = 2, extra = "") =>
  `<circle cx="50" cy="50" r="${r}" stroke="${A}" stroke-width="${sw}" fill="none" ${extra}/>`;
const dot = (cy = 27, r = 2.2) => `<circle cx="50" cy="${cy}" r="${r}" fill="${A}"/>`;
const pointer = `<line x1="50" y1="21" x2="50" y2="33" stroke="${A}" stroke-width="2.6" stroke-linecap="round"/>`;
const ticks = (n, r1, r2, sw = 1.4, slant = 0) => {
  let o = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360;
    const p1 = pt(r1, a), p2 = pt(r2, a + slant);
    o += ln(p1[0], p1[1], p2[0], p2[1], sw);
  }
  return o;
};

function glyph(type) {
  const uid = "gx" + _uid++;
  let k = "";
  switch (type) {
    case "basic": k = ci(30) + ci(21, 1.1) + pointer; break;
    case "knurl": k = ci(30) + ticks(28, 30, 25, 1.4) + ci(19, 1.1) + pointer; break;
    case "diamond": {
      let h = "";
      for (let j = -6; j <= 6; j++) {
        const off = j * 7;
        h += `<line x1="${10 + off}" y1="10" x2="${90 + off}" y2="90" stroke="${A}" stroke-width="1"/>`;
        h += `<line x1="${10 + off}" y1="90" x2="${90 + off}" y2="10" stroke="${A}" stroke-width="1"/>`;
      }
      k = `<defs><clipPath id="${uid}"><circle cx="50" cy="50" r="27"/></clipPath></defs>` +
          ci(30) + `<g clip-path="url(#${uid})" opacity="0.8">${h}</g>` + dot(50, 2.4);
      break;
    }
    case "dish": k = ci(33, 1.1, 'opacity="0.5"') + ci(30) + ci(17, 1.5) + dot(50, 2.1); break;
    case "flange": k = ci(34, 1.4, 'opacity="0.65"') + ci(28) + ticks(24, 28, 23, 1.4) + pointer; break;
    case "hex": {
      const p = []; for (let i = 0; i < 6; i++) p.push(pt(31, i * 60).map((v) => v.toFixed(1)).join(","));
      k = `<polygon points="${p.join(" ")}" stroke="${A}" stroke-width="2" fill="none"/>` + ci(17, 1.1) + pointer; break;
    }
    case "roundsquare": k = `<rect x="20" y="20" width="60" height="60" rx="16" stroke="${A}" stroke-width="2" fill="none"/>` + ci(12, 1.4) + dot(50, 2.1); break;
    case "helical": k = ci(30) + ticks(26, 30, 23, 1.4, 16) + ci(17, 1.1) + pointer; break;
    case "dome": k = ci(30) + ci(22, 1.1) + ci(12, 1.1) + ticks(28, 30, 25.5, 1.2) + pointer; break;
    case "coin": k = ci(30, 1.5) + ci(26, 1.3) + ci(22, 1.3) + ci(18, 1.3) + dot(50, 2); break;
    case "scoop": {
      let s = ""; const n = 14;
      for (let i = 0; i < n; i++) { const p = pt(29, (i / n) * 360); s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" stroke="${A}" stroke-width="1.1" fill="none"/>`; }
      k = ci(30) + s + dot(50, 2.1); break;
    }
    case "chickenhead": k = `<path d="M50 19 C61 21 69 31 66 45 C64 55 58 64 50 70 C42 64 36 55 34 45 C31 31 39 21 50 19 Z" stroke="${A}" stroke-width="2" fill="none"/><line x1="50" y1="24" x2="50" y2="33" stroke="${A}" stroke-width="2.4" stroke-linecap="round"/>`; break;
    case "lobed": {
      const N = 200, lobes = 6, R = 29, amp = 5; let d = "";
      for (let i = 0; i <= N; i++) { const a = (i / N) * 2 * Math.PI; const r = R - amp + amp * Math.cos(lobes * a); const x = 50 + r * Math.cos(a - Math.PI / 2), y = 50 + r * Math.sin(a - Math.PI / 2); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " "; }
      d += "Z"; k = `<path d="${d}" stroke="${A}" stroke-width="2" fill="none"/>` + ci(9, 1.3) + dot(50, 2); break;
    }
    case "barrel": k = `<ellipse cx="50" cy="50" rx="31" ry="29" stroke="${A}" stroke-width="2" fill="none"/>` + ticks(22, 30, 24, 1.4) + pointer; break;
    case "dial": {
      let s = ""; const start = -130, end = 130, n = 21;
      for (let i = 0; i < n; i++) { const a = start + (end - start) * i / (n - 1); const major = i % 5 === 0; const p1 = pt(30, a), p2 = pt(major ? 23 : 26, a); s += ln(p1[0], p1[1], p2[0], p2[1], major ? 1.8 : 1); }
      k = ci(20, 1.5) + s + pointer; break;
    }
    case "fullring": {
      let s = ""; const n = 36;
      for (let i = 0; i < n; i++) { const a = (i / n) * 360; const major = i % 9 === 0; const p1 = pt(31, a), p2 = pt(major ? 24 : 27, a); s += ln(p1[0], p1[1], p2[0], p2[1], major ? 1.8 : 1); }
      k = ci(20, 1.5) + s + dot(50, 2.1); break;
    }
    case "print": {
      let tp = ""; for (let i = 0; i < 5; i++) tp += `<rect x="${24 + i * 11}" y="73" width="8" height="8" rx="2" stroke="${A}" stroke-width="1.3" fill="none"/>`;
      k = ci(27, 1.8) + `<circle cx="50" cy="44" r="10" stroke="${A}" stroke-width="1.6" fill="none"/>` + `<line x1="43" y1="39" x2="57" y2="39" stroke="${A}" stroke-width="1.6"/>` + tp; break;
    }
    case "share": k = `<circle cx="50" cy="28" r="7" stroke="${A}" stroke-width="2" fill="none"/><circle cx="30" cy="66" r="7" stroke="${A}" stroke-width="2" fill="none"/><circle cx="70" cy="66" r="7" stroke="${A}" stroke-width="2" fill="none"/><line x1="46" y1="34" x2="34" y2="60" stroke="${A}" stroke-width="1.8"/><line x1="54" y1="34" x2="66" y2="60" stroke="${A}" stroke-width="1.8"/>`; break;
    case "ec11": k = ci(28, 1.8) + `<path d="M38 50 A12 12 0 1 1 62 50 L56 50 Z" stroke="${A}" stroke-width="1.6" fill="none"/>`; break;
    case "ec12": k = ci(28, 1.8) + ci(13, 1.6) + ci(7, 1.4); break;
    default: k = ci(30) + pointer;
  }
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" style="display:block">${k}</svg>`;
}

/* ---------- Populate repeated sections ---------- */
// [glyphType, name, sub, presetId] — presetId deep-links into the generator
// (app/#preset=<id>) and must match an id in app/src/cad/presets.ts.
const GALLERY = [
  ["basic", "ベーシック", "丸・面取り・指標", "basic"], ["knurl", "ローレット円筒", "縦溝28・面取り", "fluted"],
  ["diamond", "綾目ダイヤ", "ダイヤ目・ディンプル", "diamond"], ["dish", "テーパー・ディッシュ", "裾広・すり鉢・点", "dish"],
  ["flange", "フランジ台座", "裾段・縦溝", "flange"], ["hex", "六角ボルト", "六角・鋭角・面取り", "hex"],
  ["roundsquare", "角丸スクエア", "四角・角丸・リセス", "square"], ["helical", "ヘリカル・テーパー", "斜め目・裾広", "helical"],
  ["dome", "ドームトップ", "凸天面・縦溝", "dome"], ["coin", "コインエッジ", "横溝・積層風", "rings"],
  ["scoop", "指スクープ", "大スクープ・握り", "scallop"], ["chickenhead", "チキンヘッド", "指針型・面取りなし", "chickenhead"],
  ["lobed", "花形ロブ", "波型6山・リセス", "lobed"], ["barrel", "バレルグリップ", "樽型・縦溝", "barrel"],
  ["dial", "目盛りダイヤル", "弧目盛り・指標", "dial"], ["fullring", "リングダイヤル", "全周目盛り", "fullring"],
];

// Pre-baked hero meshes (site/assets/hero/<id>.json) — one is picked at random
// each page load. Regenerate with app/bake-hero.ts.
const HERO_KNOBS = ["basic", "fluted", "hex", "dome", "barrel", "lobed", "scallop", "fullring"];
const SHOWCASE = [
  ["hex", "本体形状", "多彩な本体形状", "丸・六角・角丸スクエア・花形ロブ・チキンヘッド・樽・くびれ。断面から指針まで、輪郭を自由に決められます。", ["六角", "花形ロブ", "チキンヘッド", "樽"]],
  ["knurl", "テクスチャ", "5種の側面テクスチャ", "縦溝・ヘリカル・綾目ダイヤ・横溝・指スクープ。本数も深さもねじれ角も、指掛かりは思いのまま。", ["縦溝", "ヘリカル", "綾目ダイヤ", "スクープ"]],
  ["dome", "天面・指標", "天面と指標・目盛り", "ドーム/すり鉢/リセス＋刻線、ダイヤル目盛りまで。回した位置がひと目で分かる据わりに。", ["ドーム", "すり鉢", "刻線", "目盛り"]],
  ["print", "3Dプリント", "印刷で実際に挿す", "軸穴を実寸表示。公差テストピースを刷って一番いい段を選べば、本当に軸へ挿さります。", ["実寸公差", "テストピース", "リードイン"]],
  ["share", "共有・再現", "共有して、再現する", "URL を送るだけで同じ形。注文コード・プリセット・マイプリセットで、いつでも呼び戻せます。", ["URL共有", "注文コード", "マイプリセット"]],
];
const DAYS = [["04", "dish"], ["06", "knurl"], ["11", "hex"], ["15", "dial"], ["17", "lobed"], ["20", "dome"], ["25", "coin"], ["30", "barrel"]];

function fillGallery() {
  document.getElementById("gallery-grid").innerHTML = GALLERY.map(([t, name, sub, id]) => `
    <a href="app/#preset=${id}" class="card lift4" style="text-decoration:none; padding:22px 16px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px; border-radius:20px; box-shadow:-7px -7px 15px var(--sh-light), 7px 7px 15px var(--sh-dark);">
      <div style="width:84px; height:84px; border-radius:50%; display:grid; place-items:center; padding:19px; box-shadow:inset 4px 4px 9px var(--sh-dark), inset -4px -4px 9px var(--sh-light);">
        <div style="width:100%;">${glyph(t)}</div>
      </div>
      <div><div style="font-size:14px; font-weight:700; line-height:1.3;">${name}</div>
      <div style="font-size:11.5px; color:var(--muted); margin-top:4px; line-height:1.4;">${sub}</div></div>
    </a>`).join("");
}
function fillShowcase() {
  document.getElementById("showcase-list").innerHTML = SHOWCASE.map(([t, kicker, title, desc, tags]) => `
    <article class="card" style="display:flex; gap:36px; align-items:center; padding:34px; border-radius:26px;">
      <div style="flex:none; width:170px; height:170px; border-radius:50%; display:grid; place-items:center; padding:34px; box-shadow:inset 6px 6px 14px var(--sh-dark), inset -6px -6px 14px var(--sh-light);">
        <div style="width:100%;">${glyph(t)}</div>
      </div>
      <div style="flex:1; min-width:0;">
        <div style="font-size:12px; font-weight:700; letter-spacing:2px; color:var(--accent); margin-bottom:8px;">${kicker}</div>
        <h3 style="font-size:clamp(20px,2.4vw,27px); font-weight:800; letter-spacing:-.3px; margin:0 0 10px;">${title}</h3>
        <p style="color:var(--muted); font-size:15px; line-height:1.8; margin:0 0 16px;">${desc}</p>
        <div class="tagline" style="display:flex; gap:9px; flex-wrap:wrap;">${tags.map((x) => `<span class="pill">${x}</span>`).join("")}</div>
      </div>
    </article>`).join("");
}
function fillDays() {
  document.getElementById("days-row").innerHTML = DAYS.map(([n, t]) => `
    <div style="flex:none; width:104px; text-align:center;">
      <div style="width:104px; height:104px; border-radius:20px; display:grid; place-items:center; padding:24px; box-shadow:inset 4px 4px 9px var(--sh-dark), inset -4px -4px 9px var(--sh-light);">
        <div style="width:100%;">${glyph(t)}</div></div>
      <div style="font-size:12px; font-weight:700; color:var(--muted); margin-top:9px;">Day ${n}</div>
    </div>`).join("");
}

/* ---------- Theme + accent (アプリと localStorage 共有) ---------- */
const ACCENTS = { purple: "#9d7bff", teal: "#34b7a4", amber: "#e0a23a", coral: "#ff7a6b", blue: "#5b8def" };
const LIGHT = { "--bg": "#e6e9f0", "--text": "#3f4458", "--muted": "#6d7286", "--sh-dark": "#c5c9d6", "--sh-light": "#ffffff" };
const ORDER = ["purple", "teal", "amber", "coral", "blue"];
const TKEY = "everyday-knobs.theme", AKEY = "everyday-knobs.accent";

let theme = "dark", accentKey = "purple";
try {
  const t = localStorage.getItem(TKEY); if (t === "light" || t === "dark") theme = t;
  const a = localStorage.getItem(AKEY); if (a) { const m = ORDER.find((k) => ACCENTS[k] === a); if (m) accentKey = m; }
} catch {}

function applyVars() {
  root.dataset.theme = theme;
  if (theme === "light") for (const k in LIGHT) root.style.setProperty(k, LIGHT[k]);
  else for (const k in LIGHT) root.style.removeProperty(k);
  if (accentKey === "purple") {
    if (theme === "light") root.style.setProperty("--accent", "#7c5cff");
    else root.style.removeProperty("--accent");
  } else root.style.setProperty("--accent", ACCENTS[accentKey]);

  try {
    localStorage.setItem(TKEY, theme);
    const hex = accentKey === "purple" ? "" : ACCENTS[accentKey];
    if (hex) localStorage.setItem(AKEY, hex); else localStorage.removeItem(AKEY);
  } catch {}

  const ti = document.getElementById("theme-icon"); if (ti) ti.textContent = theme === "dark" ? "☀" : "🌙";
  document.querySelectorAll("[data-accent]").forEach((b) => {
    const on = b.dataset.accent === accentKey;
    b.style.boxShadow = on
      ? `0 0 0 2px ${ACCENTS[b.dataset.accent]}, -3px -3px 7px var(--sh-light), 3px 3px 7px var(--sh-dark)`
      : "-3px -3px 7px var(--sh-light), 3px 3px 7px var(--sh-dark)";
  });
  if (window.__updateKnobColor) window.__updateKnobColor();
}

function fillSwatches() {
  document.getElementById("swatch-row").innerHTML = ORDER.map((k) =>
    `<button class="swatch" data-accent="${k}" aria-label="アクセント色 ${k}"><i style="background:${ACCENTS[k]}"></i></button>`).join("");
  document.querySelectorAll("[data-accent]").forEach((b) =>
    b.addEventListener("click", () => { accentKey = b.dataset.accent; applyVars(); }));
}

/* ---------- Hero 3D (斜め上ビュー・自動回転) ---------- */
async function initHero() {
  const mount = document.getElementById("hero3d");
  try {
    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const sz = () => Math.max(1, mount.clientWidth || 300);
    renderer.setSize(sz(), sz());
    const cv = renderer.domElement;
    cv.style.width = "100%"; cv.style.height = "100%"; cv.style.display = "block";
    mount.appendChild(cv);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(-30, 45, 35); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(35, 8, -25); scene.add(fill);

    const accentColor = () =>
      new THREE.Color((getComputedStyle(root).getPropertyValue("--accent").trim()) || "#9d7bff");
    const mat = new THREE.MeshStandardMaterial({ color: accentColor(), metalness: 0.18, roughness: 0.42 });

    const spin = new THREE.Group();
    const tilt = new THREE.Group(); tilt.rotation.x = -Math.PI / 2; // Z-up(CAD) → Y-up
    spin.add(tilt); scene.add(spin);

    const pick = HERO_KNOBS[Math.floor(Math.random() * HERO_KNOBS.length)];
    const data = await fetch(`./assets/hero/${pick}.json`).then((r) => r.json());
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(data.normals, 3));
    g.setIndex(data.indices);
    g.computeBoundingBox();
    const ctr = new THREE.Vector3(); g.boundingBox.getCenter(ctr); g.translate(-ctr.x, -ctr.y, -ctr.z);
    tilt.add(new THREE.Mesh(g, mat));

    g.computeBoundingSphere();
    const rad = g.boundingSphere.radius;
    const dist = (rad / Math.sin((camera.fov * Math.PI) / 180 / 2)) * 1.12;
    camera.position.copy(new THREE.Vector3(0.82, 0.6, 1).normalize().multiplyScalar(dist));
    camera.lookAt(0, 0, 0);

    window.__updateKnobColor = () => { mat.color = accentColor(); };
    new ResizeObserver(() => { const s = sz(); renderer.setSize(s, s); }).observe(mount);

    let last = performance.now();
    const loop = (now) => {
      const dt = (now - last) / 1000; last = now;
      if (!reduce) spin.rotation.y += dt * 0.5;
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  } catch (e) {
    // WebGL 不可など → 静止画にフォールバック
    mount.innerHTML = '<img src="assets/og.png" alt="everyday knobs" style="width:100%;height:100%;object-fit:contain;border-radius:50%">';
  }
}

/* ---------- Boot ---------- */
fillSwatches();
fillGallery();
fillShowcase();
fillDays();
document.getElementById("ec11-glyph").innerHTML = glyph("ec11");
document.getElementById("ec12-glyph").innerHTML = glyph("ec12");
document.getElementById("theme-toggle").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark"; applyVars();
});
applyVars();
initHero();
