import React from "react";
import { CaretDown, SlidersHorizontal } from "@phosphor-icons/react";
import { useEditor } from "../store/EditorContext";
import { BaseSettingsPanel } from "./panels/BaseSettingsPanel";
import { TextPanel } from "./panels/TextPanel";
import { ArtPanel } from "./panels/ArtPanel";
import { AppearancePanel } from "./panels/AppearancePanel";
import { VariantManager } from "./panels/VariantManager";
import { TopologyPanel } from "./panels/TopologyPanel";
import { TemplatePanel } from "./panels/TemplatePanel";

function Collapsible({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="panel-card">
      <div className="panel-card-header" onClick={() => setOpen((o) => !o)}>
        <span className="left">
          <span className="swatch">{icon}</span>
          {title}
        </span>
        <CaretDown size={15} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </div>
      {open && <div className="panel-card-body">{children}</div>}
    </div>
  );
}

export function ControlPanel() {
  const { state } = useEditor();
  const card = state.card;
  return (
    <aside className="control-pane">
      <div className="panel-scroll">
        <Collapsible title="基础设定" icon={<SlidersHorizontal size={15} />}>
          <BaseSettingsPanel />
        </Collapsible>
        <Collapsible title="卡面文本" icon={<>✎</>}>
          <TextPanel />
        </Collapsible>
        <Collapsible title="原画与微调" icon={<>🖼</>}>
          <ArtPanel />
        </Collapsible>
        <Collapsible title="模板与卡标" icon={<>🧩</>} defaultOpen={false}>
          <TemplatePanel />
        </Collapsible>
        <Collapsible title="高级外观微调" icon={<>🎨</>}>
          <AppearancePanel />
        </Collapsible>
        <Collapsible title={`变式管理 (${card.variants.length})`} icon={<>🔀</>}>
          <VariantManager />
        </Collapsible>
        <Collapsible title="变式拓扑蓝图" icon={<>🌐</>}>
          <TopologyPanel />
        </Collapsible>
      </div>
    </aside>
  );
}