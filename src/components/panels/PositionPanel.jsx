import React from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { useEditor } from "../../store/EditorContext";
import { updateAppearance } from "../../core/actions";
import { defaultAppearance } from "../../core/cardModel";

// 与拖动层保持一致的字段定义
const ROWS = [
  { id: "cost", label: "费用", x: "costX", y: "costY" },
  { id: "name", label: "卡名", x: "nameX", y: "nameY" },
  { id: "keyword", label: "词条", x: "keywordX", y: "keywordY" },
  { id: "rarity", label: "稀有度", x: "rarityX", y: "rarityY" },
  { id: "effect", label: "描述", x: "effectX", y: "effectY" },
  { id: "atk", label: "攻击", x: "atkX", y: "atkY" },
  { id: "def", label: "防御", x: "defX", y: "defY" },
  { id: "icon", label: "卡标", x: "iconX", y: "iconY" },
];

export function PositionPanel() {
  const { state, dispatch } = useEditor();
  const card = state.card;
  const ap = card.appearance || {};
  const defs = defaultAppearance();

  const set = (patch) =>
    dispatch(updateAppearance(card, patch, { history: true }));

  const nudge = (row, dx, dy) => {
    set({
      [row.x]: +(((ap[row.x] || 0) + dx).toFixed(1)),
      [row.y]: +(((ap[row.y] || 0) + dy).toFixed(1)),
    });
  };

  const resetRow = (row) => set({ [row.x]: 0, [row.y]: 0 });

  const resetAll = () => {
    const patch = {};
    for (const r of ROWS) {
      patch[r.x] = 0;
      patch[r.y] = 0;
    }
    set(patch);
  };

  return (
    <>
      <div className="inline-tip" style={{ marginBottom: 10 }}>
        开启预览下方 ✥ 按钮后，可直接在卡面上拖动方块微调；也可在此输入数值（逻辑像素）。
      </div>

      <div className="pos-table">
        {ROWS.map((r) => {
          const xv = ap[r.x] || 0;
          const yv = ap[r.y] || 0;
          const dirty = xv !== 0 || yv !== 0;
          return (
            <div className="pos-row" key={r.id}>
              <span className="pos-name">{r.label}</span>
              <input
                type="number"
                className="pos-input"
                value={xv}
                step="1"
                onChange={(e) => set({ [r.x]: +e.target.value || 0 })}
                aria-label={`${r.label} 横向偏移`}
              />
              <input
                type="number"
                className="pos-input"
                value={yv}
                step="1"
                onChange={(e) => set({ [r.y]: +e.target.value || 0 })}
                aria-label={`${r.label} 纵向偏移`}
              />
              <button
                className="mini-icon-btn"
                onClick={() => resetRow(r)}
                disabled={!dirty}
                title="复位此项"
                aria-label={`复位${r.label}`}
              >
                ↺
              </button>
            </div>
          );
        })}
      </div>

      <div className="btn-row" style={{ marginTop: 10 }}>
        <button className="btn soft full" onClick={resetAll}>
          <ArrowCounterClockwise size={14} /> 全部复位
        </button>
      </div>
    </>
  );
}
