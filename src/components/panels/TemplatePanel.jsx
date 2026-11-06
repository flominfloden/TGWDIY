import React, { useState, useRef } from "react";
import { UploadSimple, Trash, CheckCircle, WarningCircle, ImageSquare } from "@phosphor-icons/react";
import { useToast } from "../Toast";
import {
  analyzeTemplate,
} from "../../core/templateAnalyzer";
import {
  setCustomTemplate,
  clearCustomTemplate,
  setCustomIcon,
  hasCustomTemplate,
  hasCustomIcon,
} from "../../core/renderer";

const AREA_LABELS = {
  art: "原画窗",
  flag: "国旗盾",
  nameBar: "卡名条",
  plateC: "中央板",
  cost: "费用盾",
};

export function TemplatePanel() {
  const toast = useToast();
  const tplInput = useRef(null);
  const iconInput = useRef(null);

  const [tplName, setTplName] = useState(hasCustomTemplate() ? "已载入" : "");
  const [tplBusy, setTplBusy] = useState(false);
  const [detected, setDetected] = useState(null);
  const [iconName, setIconName] = useState(hasCustomIcon() ? "已载入" : "");

  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("读取文件失败"));
      r.readAsDataURL(file);
    });

  // 上传卡框模板
  const onPickTemplate = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.err("请选择图片文件（PNG / JPG / WebP）");
      return;
    }

    setTplBusy(true);
    try {
      const src = await readFile(file);
      const result = await analyzeTemplate(src);
      await setCustomTemplate(src, result.layout);
      setDetected(result.detected);
      setTplName(file.name);

      const miss = Object.entries(result.detected)
        .filter(([, ok]) => !ok)
        .map(([k]) => AREA_LABELS[k]);

      if (miss.length) {
        toast.info(`已载入模板，未识别出：${miss.join("、")}（可用默认位置）`);
      } else {
        toast.ok("模板已载入，各区域全部识别成功");
      }
    } catch (err) {
      toast.err("模板解析失败：" + (err.message || "未知错误"));
    } finally {
      setTplBusy(false);
    }
  };

  const onClearTemplate = () => {
    clearCustomTemplate();
    setTplName("");
    setDetected(null);
    toast.info("已恢复内置模板");
  };

  // 上传自定义卡标
  const onPickIcon = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.err("请选择图片文件");
      return;
    }
    try {
      const src = await readFile(file);
      await setCustomIcon(src);
      setIconName(file.name);
      toast.ok("卡标已替换");
    } catch (err) {
      toast.err("卡标载入失败：" + (err.message || "未知错误"));
    }
  };

  const onClearIcon = () => {
    setCustomIcon(null);
    setIconName("");
    toast.info("已恢复内置卡标");
  };

  return (
    <>
      <div className="field">
        <div className="flabel">
          卡框模板
          <span className="hint">上传自己的模板，自动识别版式</span>
        </div>

        <button
          className="btn soft full"
          onClick={() => tplInput.current && tplInput.current.click()}
          disabled={tplBusy}
        >
          <UploadSimple size={15} />
          {tplBusy ? "解析中…" : "选择模板图片"}
        </button>
        <input
          ref={tplInput}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onPickTemplate}
        />

        {tplName && (
          <div className="inline-tip" style={{ marginTop: 8 }}>
            <CheckCircle size={13} color="#2f7d4f" /> {tplName}
          </div>
        )}

        {detected && (
          <div className="chip-grid" style={{ marginTop: 8 }}>
            {Object.entries(detected).map(([k, ok]) => (
              <span key={k} className={`chip ${ok ? "on" : ""}`} style={{ cursor: "default" }}>
                {ok ? "✓" : "×"} {AREA_LABELS[k]}
              </span>
            ))}
          </div>
        )}

        {tplName && (
          <button className="btn danger sm full" style={{ marginTop: 8 }} onClick={onClearTemplate}>
            <Trash size={14} /> 恢复内置模板
          </button>
        )}
      </div>

      <div className="field">
        <div className="flabel">
          自定义卡标
          <span className="hint">替换卡面中央的兵种图标</span>
        </div>

        <button
          className="btn soft full"
          onClick={() => iconInput.current && iconInput.current.click()}
        >
          <ImageSquare size={15} /> 选择图标图片
        </button>
        <input
          ref={iconInput}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onPickIcon}
        />

        {iconName && (
          <div className="inline-tip" style={{ marginTop: 8 }}>
            <CheckCircle size={13} color="#2f7d4f" /> {iconName}
          </div>
        )}

        {iconName && (
          <button className="btn danger sm full" style={{ marginTop: 8 }} onClick={onClearIcon}>
            <Trash size={14} /> 恢复内置卡标
          </button>
        )}
      </div>

      <div className="field">
        <div className="inline-tip">
          <WarningCircle size={13} /> 模板建议使用 PNG 透明背景；识别依赖透明区与深色块的位置。
        </div>
      </div>
    </>
  );
}
