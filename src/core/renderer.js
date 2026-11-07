// 卡面渲染引擎：直接使用用户提供的卡框模板图，仅叠加原画与文字。
//
// 模板：public/assets/card/frame.png（1035x1386，含卡框、盾牌、数值板、钢盔、卡名条）
// 只画两样东西：
//   1. 模板本身
//   2. 原画（塞进模板的透明原画窗）
//   3. 文字：费用、卡名、攻防、词条、描述
import { BOLD_MARKS, NAME_BAR_COLORS } from "./constants";
import { resolveKeywords } from "./cardModel";

export const MAIN_W = 500;
export const MAIN_H = 700;
export const MINI_W = 250;
export const MINI_H = 350;

const LW = 500;
const LH = 700;

const A = "./assets";

// ---------------------------------------------------------------- 素材
// 单位卡（步兵）模板
const FRAME_UNIT = `${A}/card/frame.png`;
// 指令卡模板（1296x1808）
const FRAME_ORDER = `${A}/card/order.png`;
// 模板自带的盾牌图（备用的国旗裁剪蒙版）
const SHIELD_MASK = `${A}/card/shield_blank.png`;

function shieldMaskImg() {
  return templateCache.shield;
}

// ---------------------------------------------------------------- 版式
// 全部由 frame.png（1035x1386）实测换算到 500x700
export const LAYOUT = {
  // 原画窗（模板透明区）
  art: { x: 8.7, y: 45.5, w: 481.2, h: 468.1 },
  // 费用盾内部绘制区
  cost: { cx: 59.4, cy: 108 },
  // 国旗盾透明内区（模板盾牌内部 alpha=0，国旗画在此处，模板描边会盖在上面）
  flagInner: { x: 400.8, y: 45.5, w: 69.8, h: 111.1 },
  // 三格数值板（中心点）
  plateL: { x: 29.0, y: 451.5, w: 75.4, h: 72.7, cx: 66.7, cy: 487.9 },
  plateC: { x: 210.0, y: 448.0, w: 88.0, h: 88.0, cx: 254.0, cy: 492.0 },
  plateR: { x: 395.7, y: 451.5, w: 73.9, h: 72.7, cx: 432.7, cy: 487.9 },
  // 底部卡名条（模板自带深色胶囊）
  nameBar: { x: 10.1, y: 550.0, w: 359.4, h: 48.5, cx: 189.8, cy: 574.2 },
  // 卡名条右侧：词条区（词条与稀有度叠在同一位置）
  keyword: { cx: 431, cy: 592, w: 118, h: 48.5 },
  // 模板自带图标的精确范围（实测：钢盔居中，占板内壁约 67%）
  // 用于无自定义卡标时精确覆盖，避免盖住板面底色纹理
  iconBox: { x: 227.1, y: 471.7, w: 47.3, h: 47.0 },
  // 稀有度形状标记：与词条同一中心，被词条部分遮挡
  rarityMarkY: 616,
  // 卡名条下方：描述文字区
  textZone: { x: 14, y: 604, w: 356, h: 84 },
};

// ---------------------------------------------------------------- 指令卡版式
// 全部由 order.png（1296x1808）逐像素实测换算到 500x700
export const ORDER_LAYOUT = {
  // 原画窗：x8.1 y46.8 w484.6 h456.1
  art: { x: 8.1, y: 46.8, w: 484.6, h: 456.1 },
  // 灰区起点（模板原画窗下沿）
  grayTop: 497.9,
  // 费用盾：深色板 y53.4..150.7，中心 (62.9, 110.7)
  cost: { cx: 63.5, cy: 100.9 },
  // 国旗盾：铺满整个盾形外沿（含描边内侧），由 shieldPath 裁剪成盾形
  // 实测盾宽 x401.2..471.5（70.2），纵向 y44.5..158（约113）
  flagInner: { x: 400.0, y: 44.0, w: 72.5, h: 115.0 },
  // 中央旗子板（模板自带图标）：中心 (252.3, 480.1)
  plateC: { x: 216.0, y: 443.7, w: 72.5, h: 72.8, cx: 252.3, cy: 480.1 },
  // 底部卡名条：x8.9 y528.1 w362.7 h52.3，中心 (190.2, 554.0)
  nameBar: { x: 8.9, y: 528.1, w: 362.7, h: 52.3, cx: 190.2, cy: 554.0 },
  // 竖分隔线：x372.8（从卡名条顶部到底边）
  dividerX: 372.8,
  // 分隔线右侧区域（x373..492，宽119，中心 432.5）
  // 词条居中偏上
  keyword: { cx: 432.5, cy: 552, w: 114, h: 34 },
  // 稀有度形状：压在词条下方
  rarityMarkY: 586,
  // 卡名条下方：描述文字区 x16..368（分隔线左侧）
  textZone: { x: 16, y: 592, w: 352, h: 92 },
  // 模板自带旗子图标的精确范围（实测，占板内壁约 91%）
  iconBox: { x: 225.7, y: 455.7, w: 52.9, h: 52.7 },
  // 指令卡模板自带旗子图标，不再叠加兵种图标
  hasBuiltinIcon: true,
};

const C = {
  costNum: "#f2eee1",
  costOp: "#dfa832",
  nameText: "#f2eee1",
  statText: "#f2eee1",
  effectText: "#33332e",
  keywordText: "#2e2e2a",
  rarityMark: "#6f6f68",
};

export const FONT = {
  black: "KD-Roboto-Black",
  demi: "KD-Franklin-Demi",
  medium: "KD-Franklin-Medium",
  stencil: "KD-DDayStencil",
  cost: "KD-Hupo",
  cnBold: "KD-Kaiti",
  cnNormal: "KD-Kaiti",
  stat: "KD-Liti",
};

// ---------------------------------------------------------------- 工具

function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitSize(ctx, text, maxWidth, maxSize, minSize, family, weight = 700) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return Math.max(minSize, size);
}

// ---------------------------------------------------------------- 富文本

export function parseRich(text) {
  if (!text) return [{ t: "", b: false }];
  const runs = [];
  let i = 0;
  let buf = "";
  let bold = false;
  const flush = () => {
    if (buf.length) runs.push({ t: buf, b: bold });
    buf = "";
  };
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (BOLD_MARKS.some((m) => two === m)) {
      flush();
      bold = !bold;
      i += 2;
      continue;
    }
    buf += text[i];
    i++;
  }
  flush();
  if (!runs.length) runs.push({ t: "", b: false });
  return runs;
}

function layoutRich(ctx, runs, size, maxWidth) {
  const chars = [];
  for (const r of runs) for (const ch of r.t) chars.push({ ch, b: r.b });
  const lines = [[]];
  let curX = 0;
  for (const c of chars) {
    if (c.ch === "\n") {
      lines.push([]);
      curX = 0;
      continue;
    }
    ctx.font = `${c.b ? 700 : 400} ${size}px ${FONT.cnBold}`;
    const w = ctx.measureText(c.ch).width;
    if (curX + w > maxWidth && curX > 0) {
      lines.push([]);
      curX = 0;
    }
    lines[lines.length - 1].push({ ...c, w });
    curX += w;
  }
  return lines;
}

export function drawRichBlock(ctx, runs, cx, topY, size, lineGap, color, maxWidth) {
  const lines = layoutRich(ctx, runs, size, maxWidth);
  const step = size + lineGap;
  const left = cx - maxWidth / 2;
  let cy = topY + size / 2;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (const lineChars of lines) {
    const total = lineChars.reduce((acc, c) => acc + c.w, 0);
    let x = left + (maxWidth - total) / 2;
    for (const c of lineChars) {
      ctx.font = `${c.b ? 700 : 400} ${size}px ${FONT.cnBold}`;
      ctx.fillStyle = color;
      ctx.fillText(c.ch, x, cy);
      x += c.w;
    }
    cy += step;
  }
  return cy;
}

export function drawRichRuns(ctx, runs, x, y, size, line, color, maxWidth) {
  return drawRichBlock(ctx, runs, x + maxWidth / 2, y, size, size * (line - 1), color, maxWidth);
}

// ---------------------------------------------------------------- 国旗

function fillFlag(ctx, x, y, w, h, nation) {
  const band = (bx, by, bw, bh, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(bx, by, bw, bh);
  };

  switch (nation) {
    case "de":
      band(x, y, w, h / 3, "#1c1c1f");
      band(x, y + h / 3, w, h / 3, "#f4f3ee");
      band(x, y + (h * 2) / 3, w, h / 3, "#c8202a");
      break;
    case "fr":
      band(x, y, w / 3, h, "#1d3f8f");
      band(x + w / 3, y, w / 3, h, "#f4f3ee");
      band(x + (w * 2) / 3, y, w / 3, h, "#c8202a");
      break;
    case "soviet":
      band(x, y, w, h / 3, "#f4f3ee");
      band(x, y + h / 3, w, h / 3, "#1d4f9c");
      band(x, y + (h * 2) / 3, w, h / 3, "#c8202a");
      break;
    case "uk":
      band(x, y, w, h, "#1d3f8f");
      ctx.strokeStyle = "#f4f3ee";
      ctx.lineWidth = w * 0.13;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
      ctx.stroke();
      ctx.strokeStyle = "#c8202a";
      ctx.lineWidth = w * 0.055;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
      ctx.stroke();
      ctx.strokeStyle = "#f4f3ee";
      ctx.lineWidth = w * 0.18;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
      ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
      ctx.stroke();
      ctx.strokeStyle = "#c8202a";
      ctx.lineWidth = w * 0.1;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
      ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
      ctx.stroke();
      break;
    default:
      band(x, y, w, h, "#8d8a7e");
      break;
  }
}

// ---------------------------------------------------------------- 兵种图标

// 步兵钢盔（模板中央图标同形）
function typeIcon(ctx, cx, cy, s, type, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 目前只有步兵
  const top = cy - s * 0.26;
  const bellY = cy + s * 0.10;
  const brimY = cy + s * 0.22;
  const w = s * 0.52;

  ctx.beginPath();
  ctx.moveTo(cx - w * 1.02, brimY + s * 0.02);
  ctx.quadraticCurveTo(cx - w * 1.0, bellY + s * 0.04, cx - w * 0.92, bellY);
  ctx.quadraticCurveTo(cx - w * 0.86, top + s * 0.12, cx - w * 0.56, top + s * 0.03);
  ctx.quadraticCurveTo(cx, top - s * 0.06, cx + w * 0.56, top + s * 0.03);
  ctx.quadraticCurveTo(cx + w * 0.86, top + s * 0.12, cx + w * 0.92, bellY);
  ctx.quadraticCurveTo(cx + w * 1.0, bellY + s * 0.04, cx + w * 1.02, brimY + s * 0.02);
  ctx.quadraticCurveTo(cx, brimY + s * 0.09, cx - w * 1.02, brimY + s * 0.02);
  ctx.closePath();
  ctx.fill();

  // 帽檐分层暗线
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.78, brimY - s * 0.05);
  ctx.quadraticCurveTo(cx, brimY + s * 0.03, cx + w * 0.78, brimY - s * 0.05);
  ctx.lineWidth = s * 0.05;
  ctx.strokeStyle = "#000";
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ---------------------------------------------------------------- 稀有度形状
// 按稀有度画 N 个形状：星 / 六边形 / 三角形 / 菱形
const RARITY_SHAPES = {
  r1: { shape: "star", count: 1 },
  r2: { shape: "hexagon", count: 2 },
  r3: { shape: "triangle", count: 3 },
  r4: { shape: "diamond", count: 4 },
};

function drawShape(ctx, shape, cx, cy, r) {
  ctx.beginPath();
  switch (shape) {
    case "star": {
      // 五角星
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.44;
        const px = cx + Math.cos(ang) * rr;
        const py = cy + Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case "hexagon": {
      // 正六边形（尖角朝上）
      for (let i = 0; i < 6; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 3;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case "triangle": {
      // 正三角形（尖角朝上）
      for (let i = 0; i < 3; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case "diamond": {
      // 菱形
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.78, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.78, cy);
      ctx.closePath();
      break;
    }
    default:
      return;
  }
  ctx.fill();
}

export function drawRarityMarks(ctx, rarityId, cx, cy, color) {
  const def = RARITY_SHAPES[rarityId] || RARITY_SHAPES.r1;
  const { shape, count } = def;

  const r = 22;            // 形状半径
  const gap = 8;           // 形状间距
  const size = r * 2;
  const rowH = size * 0.98; // 行间距（上下排）

  ctx.save();
  ctx.fillStyle = color;

  if (count === 1) {
    // 稀有度一：单个居中
    drawShape(ctx, shape, cx, cy, r);
  } else if (shape === "triangle" && count === 3) {
    // 稀有度三：塔形排列（上 1 下 2）
    drawShape(ctx, shape, cx, cy - rowH / 2, r);
    drawShape(ctx, shape, cx - (size + gap) / 2, cy + rowH / 2, r);
    drawShape(ctx, shape, cx + (size + gap) / 2, cy + rowH / 2, r);
  } else if (shape === "diamond" && count === 4) {
    // 稀有度四：两排各 2 个
    drawShape(ctx, shape, cx - (size + gap) / 2, cy - rowH / 2, r);
    drawShape(ctx, shape, cx + (size + gap) / 2, cy - rowH / 2, r);
    drawShape(ctx, shape, cx - (size + gap) / 2, cy + rowH / 2, r);
    drawShape(ctx, shape, cx + (size + gap) / 2, cy + rowH / 2, r);
  } else {
    // 其他：单排水平居中
    const totalW = count * size + (count - 1) * gap;
    let x = cx - totalW / 2 + r;
    for (let i = 0; i < count; i++) {
      drawShape(ctx, shape, x, cy, r);
      x += size + gap;
    }
  }

  ctx.restore();
}

// 盾形裁剪路径（与模板盾牌同形）
function shieldPath(ctx, x, y, w, h) {
  const r = w * 0.12;
  const shoulder = y + h * 0.66;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, shoulder);
  ctx.quadraticCurveTo(x + w, y + h * 0.88, x + w / 2, y + h);
  ctx.quadraticCurveTo(x, y + h * 0.88, x, shoulder);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// 采样图标周围环带的板面颜色。
// 关键：采样点必须紧贴图标 box 的外圈（而不是板四角），
// 这样取到的才是真正的板面底色，且不受图标本身干扰。
function sampleIconSurround(ctx, ib, pc, scale) {
  const samples = [];
  const push = (lx, ly) => {
    try {
      const px = ctx.getImageData(Math.round(lx * scale), Math.round(ly * scale), 1, 1).data;
      if (px[3] > 200) samples.push([px[0], px[1], px[2]]);
    } catch {
      /* 画布污染时忽略 */
    }
  };

  // 图标 box 四周的偏移量（先试近处，再试远处）
  const gaps = [0.06, 0.10, 0.16, 0.22];
  for (const g of gaps) {
    const gapX = ib.w * g;
    const gapY = ib.h * g;
    // 上、下、左、右四条边的中点
    push(ib.x + ib.w * 0.5, ib.y - gapY);              // 上
    push(ib.x + ib.w * 0.5, ib.y + ib.h + gapY);       // 下
    push(ib.x - gapX, ib.y + ib.h * 0.5);              // 左
    push(ib.x + ib.w + gapX, ib.y + ib.h * 0.5);       // 右
  }

  // 再补板四角（离图标很远，一定安全）
  push(pc.x + pc.w * 0.10, pc.y + pc.h * 0.10);
  push(pc.x + pc.w * 0.90, pc.y + pc.h * 0.10);
  push(pc.x + pc.w * 0.10, pc.y + pc.h * 0.90);
  push(pc.x + pc.w * 0.90, pc.y + pc.h * 0.90);

  if (!samples.length) return "rgb(66,78,88)"; // 兜底

  const med = (i) => {
    const v = samples.map((s) => s[i]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  return `rgb(${med(0)},${med(1)},${med(2)})`;
}

// ---------------------------------------------------------------- 图片

export const artworkCache = new Map();
// 模板缓存：unit（步兵）/ order（指令）/ custom（用户自制）
const templateCache = { unit: null, order: null, shield: null, custom: null, customSrc: null };

// 自定义模板版式（由 templateAnalyzer 生成，存在时优先使用）
let customLayout = null;

// 模板/卡标变更版本号：UI 订阅它来触发重绘
let assetVersion = 0;
const versionListeners = new Set();

export function getAssetVersion() {
  return assetVersion;
}

export function subscribeAssetChange(fn) {
  versionListeners.add(fn);
  return () => versionListeners.delete(fn);
}

function bumpAssetVersion() {
  assetVersion++;
  versionListeners.forEach((fn) => {
    try { fn(assetVersion); } catch { /* 忽略单个订阅者异常 */ }
  });
}

/** 设置自定义卡框模板（传入图片 dataURL 与识别出的版式） */
export function setCustomTemplate(src, layout) {
  customLayout = layout || null;
  if (!src) {
    templateCache.custom = null;
    templateCache.customSrc = null;
    return Promise.resolve();
  }
  templateCache.customSrc = src;
  return loadImage(src).then((img) => {
    templateCache.custom = img || false;
    bumpAssetVersion();
  });
}

/** 清除自定义模板，回到内置模板 */
export function clearCustomTemplate() {
  templateCache.custom = null;
  templateCache.customSrc = null;
  customLayout = null;
  bumpAssetVersion();
}

/** 是否有用自定义模板 */
export function hasCustomTemplate() {
  return !!(templateCache.customSrc && customLayout);
}

// 自定义卡标（替换中央兵种图标）
const customIconCache = { src: null, img: null };
export function setCustomIcon(src) {
  customIconCache.src = src || null;
  if (!src) {
    customIconCache.img = null;
    bumpAssetVersion();
    return Promise.resolve();
  }
  return loadImage(src).then((img) => {
    customIconCache.img = img || null;
    bumpAssetVersion();
  });
}
export function hasCustomIcon() {
  return !!(customIconCache.src && customIconCache.img);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function cacheArtwork(url) {
  if (!url || artworkCache.has(url)) return Promise.resolve();
  return loadImage(url).then((img) => {
    if (img) artworkCache.set(url, img);
  });
}

// 预载卡框模板与盾牌蒙版（加载失败的记为 false，不阻塞渲染）
export async function preloadAssets() {
  const jobs = [];
  if (!templateCache.unit) jobs.push(loadImage(FRAME_UNIT).then((i) => { templateCache.unit = i || false; }));
  if (!templateCache.order) jobs.push(loadImage(FRAME_ORDER).then((i) => { templateCache.order = i || false; }));
  if (!templateCache.shield) jobs.push(loadImage(SHIELD_MASK).then((i) => { templateCache.shield = i || false; }));
  await Promise.all(jobs);
}

// 单位模板可用即视为就绪；若加载失败（false）也视为就绪，避免永久空白
export function assetsReady() {
  const u = templateCache.unit;
  if (u === false) return true;
  return !!(u && u.complete && u.naturalWidth);
}

export async function loadFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  // 全部使用子集化 WOFF2，体积约为原 TTF 的 5-30%
  const defs = [
    { family: FONT.black, url: `${A}/fonts/subset/Roboto-Black.woff2` },
    { family: FONT.demi, url: `${A}/fonts/subset/FranklinGothic-DemiCond.woff2` },
    { family: FONT.medium, url: `${A}/fonts/subset/FranklinGothic-MediumCond.woff2` },
    { family: FONT.stencil, url: `${A}/fonts/subset/DDayStencil-Regular.woff2` },
    { family: FONT.cost, url: `${A}/fonts/subset/STHUPO.woff2` },
    { family: FONT.cnBold, url: `${A}/fonts/subset/STKAITI.woff2` },
    { family: FONT.stat, url: `${A}/fonts/subset/STLITI.woff2` },
  ];
  await Promise.all(
    defs.map(async (d) => {
      try {
        const face = new FontFace(d.family, `url("${d.url}")`);
        await face.load();
        document.fonts.add(face);
      } catch (e) {
        console.warn("字体加载失败:", d.family, e);
      }
    })
  );
}

// ---------------------------------------------------------------- 原画

function drawArtwork(ctx, r, art, mode) {
  if (!art || !art.src) return false;
  const img = artworkCache.get(art.src);
  if (!img || !img.complete || !img.naturalWidth) return false;

  const cfg = (mode === "mini" ? art.mini : art.main) || { x: 0, y: 0, s: 1 };
  const s = cfg.s || 1;
  const ox = cfg.x || 0;
  const oy = cfg.y || 0;
  const cover = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * s;
  const dw = img.naturalWidth * cover;
  const dh = img.naturalHeight * cover;

  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.drawImage(
    img,
    r.x + (r.w - dw) / 2 + ox * cover,
    r.y + (r.h - dh) / 2 + oy * cover,
    dw,
    dh
  );
  ctx.restore();
  return true;
}

// ---------------------------------------------------------------- 主绘制

function drawFace(ctx, W, H, data, ap, art, mode) {
  data = data || {};
  ap = ap || {};
  const s = W / LW;

  const isOrder = data.type === "order";
  const isUnit = !isOrder;

  // 版式与模板选择：自定义模板 > 指令卡 > 单位卡
  const useCustom = !!(customLayout && templateCache.customSrc);
  let L = useCustom ? customLayout : isOrder ? ORDER_LAYOUT : LAYOUT;
  const tpl = useCustom
    ? templateCache.custom
    : isOrder
      ? templateCache.order
      : templateCache.unit;

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.scale(s, s);

  // ── 1. 先铺白底（模板透明处需要白色衬底）
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LW, LH);

  // ── 2. 原画画进模板的原画窗
  const artRect = L.art;
  drawArtwork(ctx, artRect, art, mode);

  // ── 3. 国旗：用模板自带的盾牌图作蒙版，保证形状完全一致
  if (data.nation) {
    const fi = L.flagInner;
    ctx.save();
    shieldPath(ctx, fi.x, fi.y, fi.w, fi.h);
    ctx.clip();
    fillFlag(ctx, fi.x, fi.y, fi.w, fi.h, data.nation);
    ctx.restore();
  }

  // ── 4. 叠加卡框模板（透明洞处透出原画与国旗）
  if (tpl && tpl.complete && tpl.naturalWidth) {
    ctx.drawImage(tpl, 0, 0, LW, LH);
  }

  // ── 4. 费用（模板左上费用盾内）
  const dep = data.deployCost === null || data.deployCost === undefined ? "0" : String(data.deployCost);
  const opStr = data.actionCost === null || data.actionCost === undefined ? "0" : String(data.actionCost);
  const cs = L.cost;

  if (isOrder) {
    // 指令卡：只有部署花费，单个数字居中在费用框正中
    const size = fitSize(ctx, dep, cs.w || 64, 42, 18, FONT.cost, 400);
    ctx.font = `400 ${size}px ${FONT.cost}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = ap.deployColor || C.costNum;
    ctx.fillText(dep, cs.cx + (ap.costX || 0), cs.cy + (ap.costY || 0));
  } else {
    const depSize = 34;
    const opSize = 34;
    const slashSize = 30;
    const slashGap = 8;

    ctx.font = `400 ${depSize}px ${FONT.cost}`;
    const wDep = ctx.measureText(dep).width;
    ctx.font = `400 ${opSize}px ${FONT.cost}`;
    const wOp = ctx.measureText(opStr).width;
    ctx.font = `400 ${slashSize}px ${FONT.cost}`;
    const wSlash = ctx.measureText("/").width;

    const total = wDep + slashGap * 2 + wSlash + wOp;
    let px = cs.cx - total / 2;

    // 部署
    ctx.font = `400 ${depSize}px ${FONT.cost}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = ap.deployColor || C.costNum;
    ctx.fillText(dep, px, cs.cy);
    px += wDep + slashGap;

    // 斜杠
    ctx.font = `400 ${slashSize}px ${FONT.cost}`;
    ctx.fillStyle = ap.actionColor || C.costOp;
    ctx.fillText("/", px, cs.cy);
    px += wSlash + slashGap;

    // 行动
    ctx.font = `400 ${opSize}px ${FONT.cost}`;
    ctx.fillStyle = ap.actionColor || C.costOp;
    ctx.fillText(opStr, px, cs.cy);
  }

  // ── 5. 卡名（模板自带的深色胶囊保持原样，只给文字上国家色）
  const nb = L.nameBar;

  if (data.nameZh) {
    const size = fitSize(ctx, data.nameZh, nb.w - 40, ap.nameSize || 30, 12, FONT.cnBold);
    ctx.font = `700 ${size}px ${FONT.cnBold}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 文字用国家色（军绿 / 蓝 / 黑灰 / 草绿）
    const nameColor = NAME_BAR_COLORS[data.nation] || C.nameText;
    ctx.fillStyle = ap.nameColor || nameColor;
    ctx.fillText(data.nameZh, nb.cx + (ap.nameX || 0), nb.cy + (ap.nameY || 0));
  }

  // ── 6. 攻 / 防（数值板内，隶书）；指令卡无数值
  const statColor = ap.statColor || C.statText;
  const OPT_X = -2;
  const OPT_Y = -1;

  if (isUnit) {
    const pl = L.plateL;
    const atk = String(data.attack ?? "");
    if (atk !== "") {
      const sz = fitSize(ctx, atk, pl.w - 20, ap.statSize || 54, 18, FONT.stat, 400);
      ctx.font = `400 ${sz}px ${FONT.stat}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = statColor;
      ctx.fillText(atk, pl.cx + OPT_X + (ap.statX || 0), pl.cy + OPT_Y + (ap.statY || 0));
    }

    const pr = L.plateR;
    const def = String(data.defense ?? "");
    if (def !== "") {
      const sz = fitSize(ctx, def, pr.w - 20, ap.statSize || 54, 18, FONT.stat, 400);
      ctx.font = `400 ${sz}px ${FONT.stat}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = statColor;
      ctx.fillText(def, pr.cx + OPT_X + (ap.statX || 0), pr.cy + OPT_Y + (ap.statY || 0));
    }
  }

  // ── 6.5 中央图标
  //   模板自带的图标（钢盔 / 旗子）是卡框的一部分，默认原样显示。
  //   只有用户上传了自定义卡标时，才先用同色块盖住原图标，再绘制卡标。
  if (customIconCache.img && (L.plateC || isUnit)) {
    const pc = L.plateC || { x: 210, y: 448, w: 88, h: 88 };
    const cx = pc.x + pc.w / 2 + (ap.iconX || 0);
    const cy = pc.y + pc.h / 2 + (ap.iconY || 0);
    const size = (isUnit ? 46 : 44) * (1 + (ap.iconScale || 0));

    // 只覆盖模板自带图标本身的范围（L.iconBox），保留板面其余底色纹理
    const ib = L.iconBox || null;
    if (ib) {
      const bgColor = sampleIconSurround(ctx, ib, pc, s);
      const pad = Math.max(1.2, Math.min(ib.w, ib.h) * 0.045);
      ctx.save();
      ctx.fillStyle = bgColor;
      roundRect(
        ctx,
        ib.x - pad,
        ib.y - pad,
        ib.w + pad * 2,
        ib.h + pad * 2,
        Math.min(ib.w, ib.h) * 0.10
      );
      ctx.fill();
      ctx.restore();
    }

    // 绘制自定义卡标（等比缩放，不拉伸）
    const img = customIconCache.img;
    const ratio = img.naturalWidth / img.naturalHeight;
    let dw = size;
    let dh = size;
    if (ratio > 1) dh = size / ratio;
    else dw = size * ratio;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  }

  // ── 8. 稀有度形状（下层，浅灰；被词条部分遮挡）
  //   一 → 1 五角星 | 二 → 2 六边形 | 三 → 3 三角形 | 四 → 4 菱形
  drawRarityMarks(
    ctx,
    data.rarity,
    L.keyword.cx,
    L.rarityMarkY,
    ap.rarityColor || C.rarityMark
  );

  // ── 8.5 词条（上层，深灰；可多选，竖排居中，压在稀有度形状上）
  const kwList = resolveKeywords(data);
  if (kwList.length) {
    const k = L.keyword;
    ctx.save();
    ctx.globalAlpha = 0.95;

    // 每个词条占一行，整块垂直居中
    let size = ap.keywordSize || 24;
    const lineGap = size * 0.18;
    const maxH = k.h + 24;
    while (size > 12) {
      const need = kwList.length * size + (kwList.length - 1) * lineGap;
      if (need <= maxH) break;
      size -= 1;
    }
    const step = size + lineGap;
    const blockH = kwList.length * step - lineGap;
    let y = k.cy - blockH / 2 + size / 2;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = ap.keywordColor || C.keywordText;
    for (const text of kwList) {
      const s2 = fitSize(ctx, text, k.w - 6, size, 11, FONT.cnBold);
      ctx.font = `700 ${s2}px ${FONT.cnBold}`;
      ctx.fillText(text, k.cx, y);
      y += step;
    }
    ctx.restore();
  }

  // ── 9. 描述（卡名条下方）
  if (data.effect) {
    const tz = L.textZone;
    const runs = parseRich(data.effect);
    let size = ap.effectSize || 22;
    const gap = size * ((ap.effectLine || 1.4) - 1);
    while (size > 11) {
      const lines = layoutRich(ctx, runs, size, tz.w);
      const need = lines.length * (size + gap) - gap;
      if (need <= tz.h) break;
      size -= 1;
    }
    drawRichBlock(
      ctx, runs,
      tz.x + tz.w / 2 + (ap.effectX || 0),
      tz.y + (ap.effectY || 0),
      size, gap,
      ap.effectColor || C.effectText,
      tz.w
    );
  }

  // 作者
  if (data.author) {
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.font = `400 10px ${FONT.cnBold}`;
    ctx.fillStyle = "rgba(50,48,42,0.42)";
    ctx.fillText(data.author, LW - 14, LH - 6);
  }

  ctx.restore();
}

export function renderMainCard(ctx, W, H, data, ap, art) {
  drawFace(ctx, W, H, data, ap, art, "main");
}

export function renderMiniCard(ctx, W, H, data, ap, art) {
  drawFace(ctx, W, H, data, ap, art, "mini");
}

export function loadImageToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
