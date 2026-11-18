import React, { useRef, useState, useCallback } from "react";
import { useEditor } from "../store/EditorContext";
import { resolveData } from "../core/cardModel";
import { LAYOUT, ORDER_LAYOUT, MAIN_W, MAIN_H } from "../core/renderer";

// 可拖动元素定义：xKey/yKey 对应 appearance 里的偏移字段，rect 取内置版式
function buildTargets(data) {
  const isOrder = data.type === "order";
  const L = isOrder ? ORDER_LAYOUT : LAYOUT;

  const list = [
    {
      id: "cost", label: "费用", xKey: "costX", yKey: "costY",
      rect: { x: L.cost.cx - 40, y: L.cost.cy - 46, w: 80, h: 92 },
    },
    {
      id: "name", label: "卡名", xKey: "nameX", yKey: "nameY",
      rect: { x: L.nameBar.x, y: L.nameBar.y, w: L.nameBar.w, h: L.nameBar.h },
    },
    {
      id: "keyword", label: "词条", xKey: "keywordX", yKey: "keywordY",
      rect: {
        x: L.keyword.cx - L.keyword.w / 2,
        y: L.keyword.cy - L.keyword.h / 2,
        w: L.keyword.w, h: L.keyword.h,
      },
    },
    {
      id: "rarity", label: "稀有度", xKey: "rarityX", yKey: "rarityY",
      rect: { x: L.keyword.cx - 56, y: L.rarityMarkY - 34, w: 112, h: 68 },
    },
    {
      id: "effect", label: "描述", xKey: "effectX", yKey: "effectY",
      rect: { ...L.textZone },
    },
  ];

  if (!isOrder) {
    list.push(
      {
        id: "statL", label: "攻击", xKey: "atkX", yKey: "atkY",
        rect: { x: L.plateL.x, y: L.plateL.y, w: L.plateL.w, h: L.plateL.h },
      },
      {
        id: "statR", label: "防御", xKey: "defX", yKey: "defY",
        rect: { x: L.plateR.x, y: L.plateR.y, w: L.plateR.w, h: L.plateR.h },
      },
      {
        id: "icon", label: "卡标", xKey: "iconX", yKey: "iconY",
        rect: { x: L.plateC.x, y: L.plateC.y, w: L.plateC.w, h: L.plateC.h },
      }
    );
  }

  return list;
}

/**
 * 预览层上的拖动微调覆盖层。
 * 用 window 级 pointer 监听，兼容鼠标 / 触摸 / 触控笔。
 */
export function DragTuner({ variantId, scale, active }) {
  const { state, dispatch } = useEditor();
  const card = state.card;
  const ap = card.appearance || {};
  const data = resolveData(card, variantId);

  const targets = React.useMemo(() => buildTargets(data), [data.type]);
  const [dragging, setDragging] = useState(null);
  const [selected, setSelected] = useState(null);
  const dragRef = useRef(null);

  const onPointerDown = useCallback(
    (e, t) => {
      if (!active) return;
      e.preventDefault();
      e.stopPropagation();

      // 记录拖动起点的快照，用于撤销
      const prevSnapshot = JSON.parse(JSON.stringify(card));

      dragRef.current = {
        xKey: t.xKey,
        yKey: t.yKey,
        startX: e.clientX,
        startY: e.clientY,
        baseX: ap[t.xKey] || 0,
        baseY: ap[t.yKey] || 0,
        moved: false,
        prevSnapshot,
      };
      setSelected(t.id);
      setDragging(t.id);

      const move = (ev) => {
        const d = dragRef.current;
        if (!d) return;
        ev.preventDefault?.();

        const dx = (ev.clientX - d.startX) / scale;
        const dy = (ev.clientY - d.startY) / scale;
        if (!d.moved && Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) return;
        d.moved = true;

        // 用 updater 形式，始终基于 reducer 里的最新 card 计算，
        // 避免闭包旧值覆盖前一次位移
        dispatch({
          type: "set",
          updater: (cur) => {
            const next = JSON.parse(JSON.stringify(cur));
            next.appearance = {
              ...(next.appearance || {}),
              [d.xKey]: +(d.baseX + dx).toFixed(1),
              [d.yKey]: +(d.baseY + dy).toFixed(1),
            };
            return next;
          },
        });
      };

      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);

        const d = dragRef.current;
        dragRef.current = null;
        setDragging(null);

        // 拖动结束后把起点快照压入历史，供撤销
        if (d && d.moved && d.prevSnapshot) {
          dispatch({ type: "pushHistory", prev: d.prevSnapshot });
        }
      };

      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [active, ap, card, dispatch, scale]
  );

  if (!active) return null;

  return (
    <div
      className="drag-tuner"
      style={{ width: MAIN_W * scale, height: MAIN_H * scale }}
    >
      {targets.map((t) => {
        const isSel = selected === t.id;
        // 热区位置跟随当前偏移量，拖动时才能看到方块跟着走
        const ox = ap[t.xKey] || 0;
        const oy = ap[t.yKey] || 0;
        return (
          <div
            key={t.id}
            className={`drag-zone${isSel ? " is-selected" : ""}${dragging === t.id ? " is-dragging" : ""}`}
            style={{
              left: (t.rect.x + ox) * scale,
              top: (t.rect.y + oy) * scale,
              width: t.rect.w * scale,
              height: t.rect.h * scale,
            }}
            onPointerDown={(e) => onPointerDown(e, t)}
            title={`拖动调整「${t.label}」位置`}
          >
            <span className="drag-zone-label">{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}
