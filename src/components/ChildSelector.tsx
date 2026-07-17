import { useState } from "react";
import { gradeLabels } from "../constants/gradeLabels";
import { getAbilityDisplayModel } from "../lib/ability";
import { ChildForm } from "./ChildForm";
import { createChild, deleteChild, getChildrenByParent, getPracticeRecordsByChild, logoutParent, updateChild } from "../lib/storage";
import { formatDateTime } from "../lib/time";
import type { ChildProfile, ChildProfileInput, ParentAccount } from "../types";
import { sudokuAdventureAssets } from "../ui/assets/sudokuAdventureAssets";
import { AssetImage } from "./ui/AssetImage";

interface ChildSelectorProps {
  parent: ParentAccount;
  onChanged: () => void;
  onEnter: (childId: string) => void;
  onLogout: () => void;
}

export function ChildSelector({ parent, onChanged, onEnter, onLogout }: ChildSelectorProps) {
  const children = getChildrenByParent(parent.id);
  const [showForm, setShowForm] = useState(children.length === 0);
  const [editing, setEditing] = useState<ChildProfile | undefined>();
  const [message, setMessage] = useState("");

  const submit = (input: ChildProfileInput) => {
    try {
      if (editing) {
        updateChild(parent.id, editing.id, input);
      } else {
        const created = createChild(parent.id, input);
        setShowForm(false);
        onChanged();
        onEnter(created.id);
        return;
      }
      setShowForm(false);
      setEditing(undefined);
      setMessage("");
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    }
  };

  return (
    <main className="selector-page forest-child-selector">
      <section className="forest-selector-header">
        <AssetImage src={sudokuAdventureAssets.common.explorerMascot} alt="数独探险家吉祥物" className="forest-selector-mascot" loading="eager" />
        <div><p>欢迎来到森林训练营</p><h1>数独探险家</h1><span>{parent.displayName} · 已创建孩子 {children.length} / 2</span></div>
        <button type="button" onClick={() => { logoutParent(); onLogout(); }}>退出登录</button>
      </section>

      <section className="forest-selector-panel">
        <div className="forest-selector-title">
          <div>
            <p>选择探险员</p><h2>{children.length === 0 ? "创建第一位小探险家" : "今天谁来挑战数独？"}</h2>
          </div>
          <button className="primary" onClick={() => {
            if (children.length >= 2) { setMessage("当前测试版每个家长账号最多创建 2 个学习账号。"); return; }
            setEditing(undefined); setShowForm(true);
          }}>＋ 新增孩子</button>
        </div>

        {message && <p className="result-note">{message}</p>}
        {showForm && <ChildForm child={editing} onSubmit={submit} onCancel={() => { setShowForm(false); setEditing(undefined); }} />}

        <div className="forest-child-grid">
          {children.map((child) => {
            const records = getPracticeRecordsByChild(parent.id, child.id);
            const completed = records.filter((record) => record.completed).length;
            const ability = getAbilityDisplayModel(child, records);
            return (
              <article className="forest-child-card" key={child.id} role="button" tabIndex={0} onClick={() => onEnter(child.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onEnter(child.id); }}>
                <AssetImage src={sudokuAdventureAssets.common.childAvatarBoy} alt={`${child.name}的头像`} className="forest-child-avatar" />
                <div className="forest-child-copy">
                  <p>{gradeLabels[child.gradeLevel]}</p><h3>{child.name}</h3>
                  <span>{ability.title}</span><small>{ability.subtitle}</small>
                  <em>已完成 {completed} 题 · 最近 {formatDateTime(records[0]?.finishedAt ?? records[0]?.startedAt)}</em>
                </div>
                <div className="forest-child-actions" onClick={(event) => event.stopPropagation()}>
                  <button className="primary" onClick={() => onEnter(child.id)}>开始探险</button>
                  <button onClick={() => { setEditing(child); setShowForm(true); }}>编辑</button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (window.confirm(`确定删除 ${child.name} 的账号、练习记录和题库吗？`)) {
                        deleteChild(parent.id, child.id);
                        onChanged();
                      }
                    }}
                  >
                    删除档案
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <AssetImage src={sudokuAdventureAssets.common.foliageBushes} alt="森林花丛装饰" className="forest-selector-foliage" />
    </main>
  );
}
