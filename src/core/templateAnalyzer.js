// 模板分析器：上传一张卡框模板图，自动识别各元素的绘制区域。
//
// 识别策略（把结果统一换算到 500x700 逻辑坐标）：
//   原画窗  ← 面积最大的透明连通区域
//   国旗盾  ← 右上角中型的透明连通区域
//   卡名条  ← 下半部最宽的深色连通块
//   中央板  ← 中下部接近居中的深色块
//   费用盾  ← 左上角深色块
//
// 所有阈值都留了余量，识别失败时回退到默认版式。

const LW = 500;
const LH = 700;

// 透明 / 深色的判定
const isClear = (r, g, b, a) => a < 40;
const isDark = (r, g, b, a) => a > 200 && r < 115 && g < 120 && b < 130;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });
}

// 连通块分析（按 alpha 或颜色判定），返回按面积降序的矩形列表
function findBlocks(data, W, H, predicate, { grid = 2, minArea = 400 } = {}) {
  const step = grid;
  const visited = new Uint8Array(Math.ceil(W / step) * Math.ceil(H / step));
  const gw = Math.ceil(W / step);
  const blocks = [];

  const idx = (gx, gy) => gy * gw + gx;

  for (let gy = 0; gy < Math.ceil(H / step); gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (visited[idx(gx, gy)]) continue;
      const x = gx * step;
      const y = gy * step;
      if (x >= W || y >= H) continue;
      const p = (y * W + x) * 4;
      if (!predicate(data[p], data[p + 1], data[p + 2], data[p + 3])) continue;

      // BFS 泛洪
      const stack = [[gx, gy]];
      visited[idx(gx, gy)] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;

      while (stack.length) {
        const [cx, cy] = stack.pop();
        const px = cx * step;
        const py = cy * step;
        count++;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
          const nx = cx + Math.floor(dx / step);
          const ny = cy + Math.floor(dy / step);
          if (nx < 0 || ny < 0 || nx >= gw || ny >= Math.ceil(H / step)) continue;
          if (visited[idx(nx, ny)]) continue;
          const wx = nx * step;
          const wy = ny * step;
          if (wx >= W || wy >= H) continue;
          const q = (wy * W + wx) * 4;
          if (!predicate(data[q], data[q + 1], data[q + 2], data[q + 3])) continue;
          visited[idx(nx, ny)] = 1;
          stack.push([nx, ny]);
        }
      }

      const w = maxX - minX + step;
      const h = maxY - minY + step;
      const area = w * h;
      if (count > minArea && area > minArea) {
        blocks.push({ x: minX, y: minY, w, h, cx: minX + w / 2, cy: minY + h / 2, count, area });
      }
    }
  }
  blocks.sort((a, b) => b.area - a.area);
  return blocks;
}

/**
 * 分析模板图，返回 500x700 逻辑坐标下的版式。
 * @param {string} src 图片 dataURL 或 URL
 */
export async function analyzeTemplate(src) {
  const img = await loadImage(src);
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, W, H);

  const sx = LW / W;
  const sy = LH / H;
  // 等比缩放（保持宽高比）时取较小系数，避免拉伸
  const scale = Math.min(sx, sy);

  // ---- 原画窗：所有透明像素的外包框（排除最外圈 2% 边框区）----
  const marginX = Math.round(W * 0.02);
  const marginY = Math.round(H * 0.02);
  let aMinX = W, aMinY = H, aMaxX = 0, aMaxY = 0, aCount = 0;
  for (let y = marginY; y < H - marginY; y += 2) {
    for (let x = marginX; x < W - marginX; x += 2) {
      const p = (y * W + x) * 4;
      if (isClear(data[p], data[p + 1], data[p + 2], data[p + 3])) {
        aCount++;
        if (x < aMinX) aMinX = x;
        if (x > aMaxX) aMaxX = x;
        if (y < aMinY) aMinY = y;
        if (y > aMaxY) aMaxY = y;
      }
    }
  }
  const art =
    aCount > 0
      ? { x: aMinX, y: aMinY, w: aMaxX - aMinX, h: aMaxY - aMinY, cx: (aMinX + aMaxX) / 2, cy: (aMinY + aMaxY) / 2, area: (aMaxX - aMinX) * (aMaxY - aMinY), count: aCount }
      : null;

  const darkBlocks = findBlocks(data, W, H, isDark, { grid: 2, minArea: 600 });

  // ---- 国旗盾：右上角（x>0.72, y<0.25）的透明块，尺寸远小于原画窗 ----
  // 用连通块找，比外包框精确
  const clearBlocksForFlag = findBlocks(data, W, H, isClear, { grid: 2, minArea: 300 });
  const flag =
    clearBlocksForFlag.find(
      (b) => b.cx / W > 0.7 && b.cy / H < 0.3 && b.w / W < 0.3 && b.h / H < 0.3
    ) || null;

  // ---- 卡名条：下半部、宽度超 35%、高度在 25~90px 之间的深色条 ----
  // 灰底区会被误判成大块，所以限制高度上限
  // 卡名条：下半部、横向较宽、纵向高度适中（排除面积过大的灰底）
  const nameBarCandidates = darkBlocks.filter((b) => {
    const wLog = b.w * scale;
    const hLog = b.h * scale;
    return (
      b.cy / H > 0.6 &&
      b.w / W > 0.3 &&
      wLog >= 150 &&
      wLog <= 460 &&
      hLog >= 18 &&
      hLog <= 130
    );
  });
  let nameBar = nameBarCandidates.sort((a, b) => b.w - a.w)[0] || null;

  // 回退：有些模板的深色区与外围框线连成一片，连通块法会失败。
  // 这时用「原画窗下沿」作为卡名条顶端，按原画窗高度比例推算一条标准卡名条。
  if (!nameBar && art) {
    const artBottom = (art.y + art.h) * scale;      // 原画窗底边（逻辑）
    const artLogH = art.h * scale;
    // 卡名条从原画窗底部往下约 55~75 的位置开始，高度约 50
    const barTop = artBottom + Math.max(0, artLogH * 0.12);
    const barH = 50;
    if (barTop + barH <= LH) {
      nameBar = {
        x: (art.x * scale) + 8,
        y: barTop,
        w: LW * 0.73,
        h: barH,
        cx: (art.x * scale) + 8 + LW * 0.73 / 2,
        cy: barTop + barH / 2,
        area: LW * 0.73 * barH,
        count: 0,
        estimated: true,
      };
    }
  }

  // ---- 中央板：x 居中、y 在中下部、尺寸 40~120 的方形深色块 ----
  const plateCCandidates = darkBlocks.filter((b) => {
    const wLog = b.w * scale;
    const hLog = b.h * scale;
    return (
      Math.abs(b.cx / W - 0.5) < 0.15 &&
      b.cy / H > 0.55 &&
      b.cy / H < 0.82 &&
      wLog >= 35 &&
      wLog <= 130 &&
      hLog >= 35 &&
      hLog <= 130
    );
  });
  const plateC =
    plateCCandidates.sort((a, b) => b.area - a.area)[0] || null;

  // ---- 费用盾：左上（x<0.3, y<0.35）的深色块，尺寸 30~120 ----
  const costCandidates = darkBlocks.filter((b) => {
    const wLog = b.w * scale;
    return (
      b.cx / W < 0.32 &&
      b.cy / H < 0.35 &&
      wLog >= 25 &&
      wLog <= 120
    );
  });
  const cost =
    costCandidates.sort((a, b) => b.area - a.area)[0] || null;

  // 转换成 500x700 坐标
  const toRect = (b) =>
    b
      ? {
          x: +(b.x * scale).toFixed(1),
          y: +(b.y * scale).toFixed(1),
          w: +(b.w * scale).toFixed(1),
          h: +(b.h * scale).toFixed(1),
        }
      : null;

  const toPoint = (b, dx = 0, dy = 0) =>
    b
      ? {
          cx: +((b.cx + dx) * scale).toFixed(1),
          cy: +((b.cy + dy) * scale).toFixed(1),
        }
      : null;

  const rect = {
    art: toRect(art),
    flagInner: toRect(flag),
    nameBar: toRect(nameBar),
    plateC: toRect(plateC),
    cost: toPoint(cost),
  };

  // 补齐派生值
  if (rect.nameBar) {
    rect.nameBar.cx = +(rect.nameBar.x + rect.nameBar.w / 2).toFixed(1);
    rect.nameBar.cy = +(rect.nameBar.y + rect.nameBar.h / 2).toFixed(1);
  }

  // 右侧词条区：卡名条右边缘到画布右侧
  const kwX = rect.nameBar ? rect.nameBar.x + rect.nameBar.w : LW * 0.74;
  rect.keyword = {
    cx: +((kwX + LW) / 2).toFixed(1),
    cy: rect.nameBar ? rect.nameBar.cy : LH * 0.79,
    w: +(LW - kwX - 8).toFixed(1),
    h: rect.nameBar ? rect.nameBar.h : 40,
  };

  // 稀有度标记：词条下方
  rect.rarityMarkY = rect.keyword ? +(rect.keyword.cy + 34).toFixed(1) : LH * 0.85;

  // 描述文字区：卡名条下方，宽度到分隔线
  const textTop = rect.nameBar ? rect.nameBar.y + rect.nameBar.h + 12 : LH * 0.86;
  rect.textZone = {
    x: 16,
    y: +textTop.toFixed(1),
    w: +(kwX - 28).toFixed(1),
    h: +(LH - textTop - 14).toFixed(1),
  };

  return {
    width: W,
    height: H,
    scale,
    layout: rect,
    // 识别情况，供 UI 提示
    detected: {
      art: !!art,
      flag: !!flag,
      nameBar: !!nameBar,
      plateC: !!plateC,
      cost: !!cost,
    },
  };
}
