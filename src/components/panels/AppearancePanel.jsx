import React from "react";
import { useEditor } from "../../store/EditorContext";
import { updateAppearance } from "../../core/actions";
import { defaultAppearance } from "../../core/cardModel";
import { ArrowCounterClockwise } from "@phosphor-icons/react";

// 一行外观控件：数值 + 颜色 + 坐标滑块
function ControlRow({ label, field, numeric }) {
  const { state, dispatch } = useEditor();
  const card = state.card;
  const ap = card.appearance || {};
  const val = ap[field];

  const setNumeric = (v) => {
    const n = Number(v);
    if (Number.isFinite(n)) dispatch(updateAppearance(card, { [field]: n }));
  };
  const setColor = (c) => dispatch(updateAppearance(card, { [field]: c }));

  if (numeric === "hex") {
    return (
      <div className="appearance-grid field">
        <div className="flabel" style={{ margin: 0 }}>{label}</div>
        <input type="color" className="color-input" value={val || "#ffffff"}
          onChange={(e) => setColor(e.target.value)} />
        <input type="text" value={val || ""} style={{ width: 72 }}
          onChange={(e) => setColor(e.target.value)} placeholder="#ffffff" />
      </div>
    );
  }
  if (numeric === "offset") {
    return (
      <div className="appearance-grid field">
        <div className="flabel" style={{ margin: 0 }}>{label}</div>
        <input type="number" value={Math.round(val || 0)} style={{ width: 64 }}
          onChange={(e) => setNumeric(e.target.value)} />
        <span className="hint" style={{ fontSize: 11 }}>px</span>
      </div>
    );
  }
  // 滑块数值
  return (
    <div className="field">
      <div className="flabel">
        {label}
        <span className="hint">{Math.round(val || 0)}</span>
      </div>
      <input type="range" className="slider" min={numeric?.min ?? 0} max={numeric?.max ?? 100}
        value={val ?? numeric?.def ?? 0} onChange={(e) => setNumeric(e.target.value)} />
    </div>
  );
}

export function AppearancePanel() {
  const { state, dispatch } = useEditor();
  const card = state.card;
  const ap = card.appearance || {};

  const restoreDefaults = () => {
    dispatch(updateAppearance(card, defaultAppearance()));
  };

  return (
    <>
      <div className="inline-tip" style={{ marginBottom: 12 }}>
        高级微调针对<b>当前卡面整体</b>生效（对所有变式视觉一致）。修改即实时预览。
      </div>

      {/* 卡名 */}
      <div className="flabel" style={{ marginBottom: 4 }}>卡名</div>
      <div className="field-row">
        <div>
          <div className="flabel">字号</div>
          <input type="number" className="field-input-num" style={{ width: "100%" }}
            value={ap.nameSize ?? 34} min={16} max={60}
            onChange={(e) => dispatch(updateAppearance(card, { nameSize: Number(e.target.value) }))} />
        </div>
        <div>
          <div className="flabel">颜色</div>
          <input type="color" className="color-input" value={ap.nameColor || "#ece9e2"}
            onChange={(e) => dispatch(updateAppearance(card, { nameColor: e.target.value }))} />
        </div>
      </div>
      <ControlRow label="X 偏移" field="nameX" numeric={{ min: -120, max: 120, def: 0 }} />
      <ControlRow label="Y 偏移" field="nameY" numeric={{ min: -80, max: 80, def: 0 }} />

      {/* 部署/行动费用 */}
      <div className="flabel" style={{ margin: "12px 0 4px" }}>费用</div>
      <div className="field-row-3">
        <div>
          <div className="flabel">部署</div>
          <input type="color" className="color-input" value={ap.deployColor || "#fff"}
            onChange={(e) => dispatch(updateAppearance(card, { deployColor: e.target.value }))} />
        </div>
        <div>
          <div className="flabel">行动</div>
          <input type="color" className="color-input" value={ap.actionColor || "#fff"}
            onChange={(e) => dispatch(updateAppearance(card, { actionColor: e.target.value }))} />
        </div>
        <div>
          <div className="flabel">位置 Y</div>
          <input type="number" value={Math.round(ap.costY || 0)} style={{ width: "100%" }}
            onChange={(e) => dispatch(updateAppearance(card, { costY: Number(e.target.value) }))} />
        </div>
      </div>
      <ControlRow label="费用 X 偏移" field="costX" numeric={{ min: -60, max: 60, def: 0 }} />

      {/* 攻防数值 */}
      <div className="flabel" style={{ margin: "12px 0 4px" }}>攻防数值</div>
      <div className="field-row">
        <div>
          <div className="flabel">字号</div>
          <input type="number" value={ap.statSize ?? 40} style={{ width: "100%" }} min={20} max={80}
            onChange={(e) => dispatch(updateAppearance(card, { statSize: Number(e.target.value) }))} />
        </div>
        <div>
          <div className="flabel">颜色</div>
          <input type="color" className="color-input" value={ap.statColor || "#ece9e2"}
            onChange={(e) => dispatch(updateAppearance(card, { statColor: e.target.value }))} />
        </div>
      </div>
      <div className="inline-tip" style={{ marginBottom: 8 }}>
        攻防的独立位置在「元素位置微调」面板里调整。
      </div>

      {/* 特效 */}
      <div className="flabel" style={{ margin: "12px 0 4px" }}>特效文本</div>
      <div className="field-row">
        <div>
          <div className="flabel">字号</div>
          <input type="number" value={ap.effectSize ?? 17} style={{ width: "100%" }} min={10} max={30}
            onChange={(e) => dispatch(updateAppearance(card, { effectSize: Number(e.target.value) }))} />
        </div>
        <div>
          <div className="flabel">颜色</div>
          <input type="color" className="color-input" value={ap.effectColor || "#ece9e2"}
            onChange={(e) => dispatch(updateAppearance(card, { effectColor: e.target.value }))} />
        </div>
      </div>
      <div className="field-row">
        <div>
          <div className="flabel">行距</div>
          <input type="number" value={ap.effectLine ?? 1.4} style={{ width: "100%" }} min={1} max={2.5} step={0.05}
            onChange={(e) => dispatch(updateAppearance(card, { effectLine: Number(e.target.value) }))} />
        </div>
        <div>
          <div className="flabel">字距</div>
          <input type="number" value={ap.effectSpacing ?? 0.6} style={{ width: "100%" }} min={0} max={2} step={0.1}
            onChange={(e) => dispatch(updateAppearance(card, { effectSpacing: Number(e.target.value) }))} />
        </div>
      </div>

      {/* 词条 */}
      <div className="flabel" style={{ margin: "12px 0 4px" }}>词条</div>
      <div className="field-row">
        <div>
          <div className="flabel">字号</div>
          <input type="number" value={ap.keywordSize ?? 19} style={{ width: "100%" }} min={12} max={30}
            onChange={(e) => dispatch(updateAppearance(card, { keywordSize: Number(e.target.value) }))} />
        </div>
        <div>
          <div className="flabel">颜色</div>
          <input type="color" className="color-input" value={ap.keywordColor || "#e09150"}
            onChange={(e) => dispatch(updateAppearance(card, { keywordColor: e.target.value }))} />
        </div>
      </div>

      {/* 图标 */}
      <div className="flabel" style={{ margin: "12px 0 4px" }}>小图标</div>
      <div className="field-row-3">
        <div>
          <div className="flabel">X</div>
          <input type="number" value={Math.round(ap.iconX || 0)} style={{ width: "100%" }}
            onChange={(e) => dispatch(updateAppearance(card, { iconX: Number(e.target.value) }))} />
        </div>
        <div>
          <div className="flabel">Y</div>
          <input type="number" value={Math.round(ap.iconY || 0)} style={{ width: "100%" }}
            onChange={(e) => dispatch(updateAppearance(card, { iconY: Number(e.target.value) }))} />
        </div>
        <div>
          <div className="flabel">颜色</div>
          <input type="color" className="color-input" value={ap.iconColor || "#fff"}
            onChange={(e) => dispatch(updateAppearance(card, { iconColor: e.target.value }))} />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn full" onClick={restoreDefaults}>
          <ArrowCounterClockwise size={15} /> 恢复默认外观
        </button>
      </div>
    </>
  );
}