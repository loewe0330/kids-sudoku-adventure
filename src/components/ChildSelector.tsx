import { useState } from "react";
import { getDifficultyLevel } from "../constants/difficultyLevels";
import { gradeLabels } from "../constants/gradeLabels";
import { ChildForm } from "./ChildForm";
import { createChild, deleteChild, getChildrenByParent, getPracticeRecordsByChild, logoutParent, updateChild } from "../lib/storage";
import { formatDateTime } from "../lib/time";
import type { ChildProfile, ChildProfileInput, ParentAccount } from "../types";

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
        createChild(parent.id, input);
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
    <main className="selector-page child-selector-page">
      <section className="selector-hero quest-hero">
        <p className="eyebrow">本地网页版</p>
        <h1>儿童数独分级训练</h1>
        <p>{parent.displayName}（{parent.username}） · 已创建孩子 {children.length} / 2。</p>
      </section>

      <section className="panel">
        <div className="section-title">
          <div>
            <h2>选择孩子账号</h2>
            <p>{children.length === 0 ? "先创建第一个孩子。" : "进入后开始练习或查看题库。"}</p>
          </div>
          <div className="section-actions">
            <button
              className="primary"
              onClick={() => {
                if (children.length >= 2) {
                  setMessage("当前测试版每个家长账号最多创建 2 个学习账号。");
                  return;
                }
                setEditing(undefined);
                setShowForm(true);
              }}
            >
              新增孩子
            </button>
            <button onClick={() => { logoutParent(); onLogout(); }}>退出登录</button>
          </div>
        </div>

        {message && <p className="result-note">{message}</p>}
        {showForm && <ChildForm child={editing} onSubmit={submit} onCancel={() => { setShowForm(false); setEditing(undefined); }} />}

        <div className="child-grid">
          {children.map((child) => {
            const records = getPracticeRecordsByChild(parent.id, child.id);
            const completed = records.filter((record) => record.completed).length;
            return (
              <article className="child-card" key={child.id} onClick={() => onEnter(child.id)}>
                <div className={`avatar avatar-${child.avatar ?? "sun"}`}>{child.name.slice(0, 1)}</div>
                <div>
                  <h3>{child.name}</h3>
                  <p>{gradeLabels[child.gradeLevel]}</p>
                  <p>{getDifficultyLevel(child.currentLevel).label}</p>
                  <p>已完成 {completed} 题 · 最近 {formatDateTime(records[0]?.finishedAt ?? records[0]?.startedAt)}</p>
                </div>
                <div className="card-actions" onClick={(event) => event.stopPropagation()}>
                  <button className="primary" onClick={() => onEnter(child.id)}>进入练习</button>
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
                    删除
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
