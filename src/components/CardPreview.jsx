import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor } from "../store/EditorContext";
import {
  renderMainCard, MAIN_W, MAIN_H, assetsReady,
  subscribeAssetChange, getAssetVersion,
} from "../core/renderer";
import { resolveData, resolveArt, variantInfo } from "../core/cardModel";

const MIN_SIZE = 0.2;
const MAX_SIZE = 3.0;

// 单个 Canvas
function CanvasFace({ card, variantId, size }) {
  const ref = useRef(null);
  const data = resolveData(card, variantId);
  const art = resolveArt(card, variantId);
  const ap = card.appearance;
  // 模板/卡标变更时递增，触发重绘
  const [assetVer, setAssetVer] = React.useState(getAssetVersion());

  useEffect(() => subscribeAssetChange(setAssetVer), []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;

    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // 画布分辨率固定按 1x 逻辑尺寸渲染，再靠 CSS 缩放显示，避免大尺寸下内存爆掉
      const pw = Math.round(MAIN_W * dpr);
      const ph = Math.round(MAIN_H * dpr);
      if (c.width !== pw || c.height !== ph) {
        c.width = pw;
        c.height = ph;
      }
      const ctx = c.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, MAIN_W, MAIN_H);
      renderMainCard(ctx, MAIN_W, MAIN_H, data, ap, art);
    };

    paint();
    if (!assetsReady()) {
      let alive = true;
      const retry = () => { if (alive) paint(); };
      if (typeof document !== "undefined" && document.fonts) {
        document.fonts.ready.then(retry).catch(() => {});
      }
      const t = setTimeout(retry, 400);
      return () => { alive = false; clearTimeout(t); };
    }
  }, [data, art, ap, variantId, card.variants.length, card.appearance, assetVer]);

  return (
    <canvas
      ref={ref}
      style={{
        display: "block",
        width: Math.round(MAIN_W * size) + "px",
        height: Math.round(MAIN_H * size) + "px",
      }}
    />
  );
}

export function CardPreviewFace({ variantId }) {
  const { state } = useEditor();
  const card = state.card;
  const info = variantInfo(card, variantId);

  const rootRef = useRef(null);
  const labelRef = useRef(null);
  const barRef = useRef(null);
  const stageRef = useRef(null);

  const [manual, setManual] = useState(null); // null = 自适应
  const [fit, setFit] = useState(0.8);

  // 按可用空间自适应
  const measure = useCallback(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    const stageW = stage.clientWidth;
    const stageH = stage.clientHeight;
    if (!stageW || !stageH) return;

    const labelH = labelRef.current?.offsetHeight || 0;
    const barH = barRef.current?.offsetHeight || 0;
    // .card-preview 的 gap(8) * 2 段 + stage padding(8*2)
    const reserve = labelH + barH + 8 * 2 + 8 * 2;

    const availW = stageW - 16;
    const availH = stageH - reserve;
    if (availW <= 0 || availH <= 0) return;

    const s = Math.min(availW / MAIN_W, availH / MAIN_H);
    setFit(Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.floor(s * 100) / 100)));
  }, []);

  useEffect(() => {
    measure();
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  const size = manual ?? fit;

  // 缩放到指定比例（带边界）
  const setSize = (v) => {
    setManual(Math.max(MIN_SIZE, Math.min(MAX_SIZE, +v.toFixed(3))));
  };

  const bump = (dir) => {
    const cur = size;
    // 按当前比例的相对步长，大卡时步长也大，手感更均匀
    const step = cur < 0.5 ? 0.05 : cur < 1.2 ? 0.1 : 0.2;
    setSize(cur + dir * step);
  };

  // 滚轮缩放：以光标为锚点，缩放后卡面不跑偏
  const onWheel = (e) => {
    e.preventDefault();
    const cur = size;

    // 滚轮一格 deltaY≈100；用指数曲线让快滚快缩、慢滚精细
    const dir = e.deltaY < 0 ? 1 : -1;
    const factor = e.shiftKey ? 1.015 : 1.08;
    const next = dir > 0 ? cur * factor : cur / factor;

    // 以光标为锚点调整滚动位置
    const stage = stageRef.current;
    if (stage) {
      const rect = stage.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const ratioX = (stage.scrollLeft + cx) / Math.max(1, stage.scrollWidth);
      const ratioY = (stage.scrollTop + cy) / Math.max(1, stage.scrollHeight);

      const clamped = Math.max(MIN_SIZE, Math.min(MAX_SIZE, next));
      setSize(clamped);

      // 下一帧把滚动位置对齐到同一相对点
      requestAnimationFrame(() => {
        const el = stageRef.current;
        if (!el) return;
        el.scrollLeft = ratioX * el.scrollWidth - cx;
        el.scrollTop = ratioY * el.scrollHeight - cy;
      });
    } else {
      setSize(next);
    }
  };

  return (
    <div
      className="card-preview is-main"
      ref={rootRef}
      style={info.depth > 0 ? { borderTop: "2px solid var(--gold)" } : {}}
    >
      <div className="label" ref={labelRef}>
        卡面
        {info.depth > 0 && <span className="tag">{info.label}</span>}
      </div>

      <div className="preview-stage-single" ref={stageRef} onWheel={onWheel}>
        <div className="card-canvas-wrap" title="滚轮缩放 · Shift 精细调节">
          <CanvasFace card={card} variantId={variantId} size={size} />
        </div>
      </div>

      <div className="preview-zoom-bar" ref={barRef}>
        <button className="icon-btn" onClick={() => bump(-1)} aria-label="缩小">−</button>
        <span>{Math.round(size * 100)}%</span>
        <button className="icon-btn" onClick={() => bump(1)} aria-label="放大">+</button>
        <button
          className="icon-btn reset"
          onClick={() => setManual(null)}
          aria-label="恢复自适应"
          title="恢复自适应"
        >
          ⤢
        </button>
      </div>
    </div>
  );
}

export function CardPreview({ variantId }) {
  return <CardPreviewFace variantId={variantId} />;
}

// 兼容旧引用名
export const DualCardPreview = CardPreview;
