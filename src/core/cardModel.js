// 卡牌数据模型：变式树结构
// 每个「变式节点」是一张卡面。根节点是基础形态，children 是子级分支形态。
import { KEYWORD_LABELS } from "./constants";

export function createVariantNode({
  id,
  label = "未命名卡面",
  kind = "base",
  data = null, // 覆盖字段或 null(继承父级)
  art = null, // 独立卡画 {src, main:{x,y,s}, mini:{x,y,s}} 或 null(沿用父级)
  parentId = null,
}) {
  return { id, label, kind, data, art, parentId };
}

// 卡牌数值字段的默认值
export function defaultCardData() {
  return {
    nameZh: "",
    nameEn: "",
    type: "infantry",
    rarity: "r1",
    nation: "de",
    style: "standard",
    faceStyle: "native",
    deployCost: 3,
    actionCost: 2,
    attack: 3,
    defense: 4,
    keywords: "",
    keywordIds: ["blitz2"],   // 多选词条 id
    customKeyword: "",        // 自定义词条文本
    effect: "",
    author: "",
    global: false,
  };
}

export function createCard(id = "c1") {
  const root = createVariantNode({ id: `${id}-base`, label: "基础形态", kind: "base" });
  return {
    id,
    name: "未命名卡牌",
    savedAt: null,
    variants: [root],
    // 全局外观微调（作用于所有卡面）
    appearance: defaultAppearance(),
    activeVariantId: `${id}-base`,
  };
}

export function defaultAppearance() {
  return {
    // 名字与费用（新版式：深蓝板上用奶白/金色字）
    nameSize: 34,
    nameX: 0, nameY: 0, nameColor: "#f4f2e8",
    costX: 0, costY: 0,
    deployColor: "#f7f6ee", actionColor: "#e0a92c", kColor: "#e0a92c",
    // 攻防数值与图标（深蓝板上的奶白字）
    statSize: 68, statX: 0, statY: 0, statColor: "#f2f0e6",
    // 攻击 / 防御各自独立的偏移（拖动微调用）
    atkX: 0, atkY: 0, defX: 0, defY: 0,
    iconX: 0, iconY: 0, iconColor: "#f2f0e6",
    // 描述与词条字体（灰色特效区上的深灰字）
    effectSize: 25, effectLine: 1.45, effectSpacing: 0.6, effectColor: "#33322e",
    effectX: 0, effectY: 0,
    keywordSize: 24, keywordColor: "#2d2c28",
    keywordX: 0, keywordY: 0,
    // 稀有度形状标记的位置微调
    rarityX: 0, rarityY: 0,
    orderTypeColor: "#f2f0e6",
  };
}

// ---- 帮助函数 ----

export function nextId(prefix = "v") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function findVariant(card, id) {
  const walk = (n) => {
    if (n.id === id) return n;
    for (const c of n.children || []) {
      const r = walk(c);
      if (r) return r;
    }
    return null;
  };
  // variants 是扁平数组
  return card.variants.find((v) => v.id === id) || null;
}

// 取某节点实际生效的数据（沿祖先链合并）
export function resolveData(card, variantId) {
  const node = findVariant(card, variantId);
  if (!node) return defaultCardData();
  const merged = defaultCardData();
  const chain = [];
  let cur = node;
  // 先确定从根到当前节点的链（扁平数组里通过 parentId）
  while (cur) {
    chain.unshift(cur);
    cur = cur.parentId ? findVariant(card, cur.parentId) : null;
  }
  for (const v of chain) {
    if (v.data) Object.assign(merged, v.data);
  }
  return merged;
}

// 取某节点的独立卡画；若无独立卡画则向上沿用父级
export function resolveArt(card, variantId) {
  let cur = findVariant(card, variantId);
  while (cur) {
    if (cur.art && cur.art.src) return cur.art;
    cur = cur.parentId ? findVariant(card, cur.parentId) : null;
  }
  return null;
}

export function rootVariant(card) {
  return card.variants.find((v) => !v.parentId) || card.variants[0];
}

/**
 * 把多选词条 + 自定义合成要显示的词条列表（每个元素竖排一行）。
 * 兼容旧数据：没有 keywordIds 时回退到 keywords 字符串。
 */
export function resolveKeywords(data) {
  const ids = Array.isArray(data.keywordIds)
    ? data.keywordIds
    : data.keywords
      ? [data.keywords]
      : [];

  const list = [];
  for (const id of ids) {
    if (id === "custom") {
      const t = (data.customKeyword || "").trim();
      if (t) list.push(t);
    } else {
      const t = KEYWORD_LABELS[id] || String(id || "").trim();
      if (t) list.push(t);
    }
  }
  return list;
}

// 统计节点深度
export function variantDepth(card, id) {
  let d = 0;
  let cur = findVariant(card, id);
  while (cur && cur.parentId) {
    d++;
    cur = findVariant(card, cur.parentId);
  }
  return d;
}

export function variantInfo(card, id) {
  const v = findVariant(card, id);
  return {
    id,
    isRoot: v ? !v.parentId : false,
    depth: v ? variantDepth(card, id) : 0,
    kind: v ? v.kind : "base",
    label: v ? v.label : "未知",
  };
}

// 相邻关系（用于拓扑图）
export function childrenOf(card, id) {
  return card.variants.filter((v) => v.parentId === id);
}

export function siblingsOf(card, id) {
  const v = findVariant(card, id);
  if (!v || !v.parentId) return [];
  return card.variants.filter((x) => x.parentId === v.parentId);
}