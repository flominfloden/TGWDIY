import React, { useState, useRef } from "react";
import { UploadSimple, Trash, CheckCircle, ImageSquare, Info } from "@phosphor-icons/react";
import { useToast } from "../Toast";
import {
  setCustomTemplate,
  clearCustomTemplate,
  setCustomIcon,
  hasCustomTemplate,
  hasCustomIcon,
} from "../../core/renderer";

export function TemplatePanel() {
  const toast = useToast();
  const tplInput = useRef(null);
  const iconInput = useRef(null);

  const [tplName, setTplName] = useState(hasCustomTemplate() ? "已载入" : "");
  const [tplBusy, setTplBusy] = useState(false);
  const [iconName, setIconName] = useState(hasCustomIcon() ? "已载入" : "");

  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("读取文件失败"));
      r.readAsDataURL(file);
    });

  // 上传卡框模板：只换底图，文字位置沿用内置版式
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
      await setCustomTemplate(src);
      setTplName(file.name);
      toast.ok("卡框已替换");
    } catch (err) {
      toast.err("载入失败：" + (err.message || "未知错误"));
    } finally {
      setTplBusy(false);
    }
  };

  const onClearTemplate = () => {
    clearCustomTemplate();
    setTplName("");
    toast.info("已恢复内置卡框");
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
          <span className="hint">替换底图，文字位置不变</span>
        </div>

        <button
          className="btn soft full"
          onClick={() => tplInput.current && tplInput.current.click()}
          disabled={tplBusy}
        >
          <UploadSimple size={15} />
          {tplBusy ? "载入中…" : "选择卡框图"}
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

        {tplName && (
          <button className="btn danger sm full" style={{ marginTop: 8 }} onClick={onClearTemplate}>
            <Trash size={14} /> 恢复内置卡框
          </button>
        )}

        <div className="inline-tip" style={{ marginTop: 8 }}>
          <Info size={13} /> 卡框图会按 500×700 拉伸铺满，建议使用相同比例的图片。
        </div>
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
    </>
  );
}
