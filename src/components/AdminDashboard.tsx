import { useState } from "react";
import {
  createParentAccount,
  deleteParentAccount,
  disableParentAccount,
  enableParentAccount,
  getAppStorage,
  getParentAccounts,
  getPracticeRecordsByParent,
  hashPassword,
  logout,
  resetParentPassword,
  saveAppStorage,
  updateParentAccount
} from "../lib/storage";
import { formatDateTime } from "../lib/time";
import type { AppStorage, ParentAccount, ParentAccountInput, PracticeRecord } from "../types";
import { ParentAccountForm } from "./ParentAccountForm";
import { PasswordField } from "./PasswordField";

interface AdminDashboardProps {
  onChanged: () => void;
}

export function AdminDashboard({ onChanged }: AdminDashboardProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ParentAccount | undefined>();
  const [resetting, setResetting] = useState<ParentAccount | undefined>();
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetConfirmValue, setResetConfirmValue] = useState("");
  const [message, setMessage] = useState("");
  const [dataText, setDataText] = useState("");
  const storage = getAppStorage();
  const parents = getParentAccounts();

  const saveParent = async (input: ParentAccountInput) => {
    if (editing) {
      updateParentAccount(editing.id, { displayName: input.displayName, status: input.enabled === false ? "disabled" : "enabled" });
    } else {
      await createParentAccount(input);
    }
    setShowForm(false);
    setEditing(undefined);
    onChanged();
  };

  const createDemoStorage = async (): Promise<AppStorage> => {
    const current = getAppStorage();
    const now = new Date().toISOString();
    const parentId = "demo-parent";
    const childAId = "demo-child-a";
    const childBId = "demo-child-b";
    const records: PracticeRecord[] = [
      { id: "demo-r1", parentId, childId: childAId, puzzleId: "demo-p1", gradeLevel: "grade3", level: 1, size: 4, difficulty: "starter", startedAt: "2026-01-01T08:00:00.000Z", finishedAt: "2026-01-01T08:02:00.000Z", durationSeconds: 120, mistakeCount: 0, hintCount: 0, completed: true, gaveUp: false, stars: 3, mode: "adventure", stageIndex: 1 },
      { id: "demo-r2", parentId, childId: childAId, puzzleId: "demo-p2", gradeLevel: "grade3", level: 1, size: 4, difficulty: "starter", startedAt: "2026-01-02T08:00:00.000Z", finishedAt: "2026-01-02T08:03:00.000Z", durationSeconds: 180, mistakeCount: 1, hintCount: 1, completed: true, gaveUp: false, stars: 2, mode: "adventure", stageIndex: 2 },
      { id: "demo-r3", parentId, childId: childAId, puzzleId: "demo-p3", gradeLevel: "grade3", level: 1, size: 4, difficulty: "starter", startedAt: "2026-01-03T08:00:00.000Z", finishedAt: "2026-01-03T08:04:30.000Z", durationSeconds: 270, mistakeCount: 2, hintCount: 2, completed: true, gaveUp: false, stars: 1, mode: "adventure", stageIndex: 3 },
      { id: "demo-r4", parentId, childId: childBId, puzzleId: "demo-p4", gradeLevel: "middle", level: 10, size: 9, difficulty: "hard", startedAt: "2026-01-04T08:00:00.000Z", finishedAt: "2026-01-04T08:18:00.000Z", durationSeconds: 1080, mistakeCount: 1, hintCount: 0, completed: true, gaveUp: false, stars: 2, mode: "challenge" }
    ];

    return {
      ...current,
      parentAccounts: [
        ...current.parentAccounts.filter((parent) => parent.id !== parentId),
        {
          id: parentId,
          username: "demo-parent",
          displayName: "示例家长",
          passwordHash: await hashPassword("demo123"),
          status: "enabled",
          createdAt: now,
          updatedAt: now
        }
      ],
      children: [
        ...current.children.filter((child) => child.parentId !== parentId),
        {
          id: childAId,
          parentId,
          name: "安安",
          gradeLevel: "grade3",
          avatar: "leaf",
          createdAt: now,
          updatedAt: now,
          smartDifficultyEnabled: true,
          currentLevel: 2,
          adventureProgress: [
            { parentId, childId: childAId, level: 1, stageIndex: 1, bestStars: 3, completed: true, unlocked: true, createdAt: now, updatedAt: now },
            { parentId, childId: childAId, level: 1, stageIndex: 2, bestStars: 2, completed: true, unlocked: true, createdAt: now, updatedAt: now },
            { parentId, childId: childAId, level: 1, stageIndex: 3, bestStars: 1, completed: true, unlocked: true, createdAt: now, updatedAt: now },
            { parentId, childId: childAId, level: 1, stageIndex: 4, bestStars: 0, completed: false, unlocked: true, createdAt: now, updatedAt: now },
            { parentId, childId: childAId, level: 2, stageIndex: 1, bestStars: 0, completed: false, unlocked: true, createdAt: now, updatedAt: now }
          ],
          settings: { soundEnabled: false, immediateErrorFeedback: true, showTimer: true, practiceMode: "adventure", successAnimationEnabled: true, reducedMotion: false }
        },
        {
          id: childBId,
          parentId,
          name: "小辰",
          gradeLevel: "middle",
          avatar: "moon",
          createdAt: now,
          updatedAt: now,
          smartDifficultyEnabled: true,
          currentLevel: 10,
          adventureProgress: [],
          settings: { soundEnabled: false, immediateErrorFeedback: true, showTimer: true, practiceMode: "challenge", successAnimationEnabled: true, reducedMotion: false }
        }
      ],
      practiceRecords: [...current.practiceRecords.filter((record) => record.parentId !== parentId), ...records],
      puzzleBank: current.puzzleBank.filter((puzzle) => puzzle.parentId !== parentId)
    };
  };

  return (
    <main className="app-shell">
      <header className="app-header no-print">
        <div>
          <p className="eyebrow">测试版后台</p>
          <h1>管理者后台</h1>
          <p>创建、编辑、停用、删除家长账号。当前为测试版账号系统，请勿用于真实公网密码。</p>
        </div>
        <div className="top-actions">
          <button className="primary" onClick={() => { setEditing(undefined); setShowForm(true); }}>新增家长</button>
          <button onClick={() => { logout(); onChanged(); }}>退出后台</button>
        </div>
      </header>

      <section className="panel">
        <h2>测试数据工具</h2>
        <p>示例账号：demo-parent / demo123。导出和导入会包含星级记录与闯关地图进度。</p>
        <div className="form-actions">
          <button
            className="primary"
            onClick={async () => {
              saveAppStorage(await createDemoStorage());
              setMessage("已生成示例测试数据。");
              onChanged();
            }}
          >
            生成示例数据
          </button>
          <button
            onClick={() => {
              setDataText(JSON.stringify(getAppStorage(), null, 2));
              setMessage("已导出当前测试数据。");
            }}
          >
            导出测试数据
          </button>
          <button
            onClick={() => {
              try {
                saveAppStorage(JSON.parse(dataText));
                setMessage("已导入测试数据。");
                onChanged();
              } catch {
                setMessage("导入失败，请检查 JSON 格式。");
              }
            }}
          >
            导入测试数据
          </button>
        </div>
        <textarea
          className="data-textarea"
          value={dataText}
          onChange={(event) => setDataText(event.target.value)}
          placeholder="导出的 JSON 会显示在这里，也可以粘贴 JSON 后导入。"
        />
      </section>

      {showForm && (
        <section className="panel">
          <h2>{editing ? "编辑家长账号" : "新增家长账号"}</h2>
          <ParentAccountForm parent={editing} onSubmit={saveParent} onCancel={() => { setShowForm(false); setEditing(undefined); }} />
        </section>
      )}

      {message && <p className="result-note">{message}</p>}

      {resetting && (
        <section className="panel">
          <h2>重置 {resetting.displayName} 的密码</h2>
          <form
            className="child-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (resetPasswordValue !== resetConfirmValue) {
                setMessage("两次密码不一致。");
                return;
              }
              try {
                await resetParentPassword(resetting.id, resetPasswordValue);
                setMessage("密码已重置。");
                setResetting(undefined);
                setResetPasswordValue("");
                setResetConfirmValue("");
                onChanged();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "重置失败");
              }
            }}
          >
            <PasswordField label="新密码" value={resetPasswordValue} onChange={setResetPasswordValue} autoComplete="new-password" />
            <PasswordField label="确认新密码" value={resetConfirmValue} onChange={setResetConfirmValue} autoComplete="new-password" />
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setResetting(undefined);
                  setResetPasswordValue("");
                  setResetConfirmValue("");
                }}
              >
                取消
              </button>
              <button className="primary" type="submit">确认重置密码</button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <h2>家长账号列表</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>账号</th>
                <th>昵称</th>
                <th>状态</th>
                <th>孩子数</th>
                <th>练习数</th>
                <th>最近登录</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {parents.map((parent) => {
                const childCount = storage.children.filter((child) => child.parentId === parent.id).length;
                const practiceCount = getPracticeRecordsByParent(parent.id).length;
                return (
                  <tr key={parent.id}>
                    <td>{parent.username}</td>
                    <td>{parent.displayName}</td>
                    <td>{parent.status === "enabled" ? "启用" : "停用"}</td>
                    <td>{childCount}</td>
                    <td>{practiceCount}</td>
                    <td>{formatDateTime(parent.lastLoginAt)}</td>
                    <td>{formatDateTime(parent.createdAt)}</td>
                    <td>
                      <div className="card-actions">
                        <button onClick={() => { setEditing(parent); setShowForm(true); }}>编辑</button>
                        <button onClick={() => { parent.status === "enabled" ? disableParentAccount(parent.id) : enableParentAccount(parent.id); onChanged(); }}>
                          {parent.status === "enabled" ? "停用" : "启用"}
                        </button>
                        <button
                          onClick={() => {
                            setResetting(parent);
                            setResetPasswordValue("");
                            setResetConfirmValue("");
                          }}
                        >
                          重置密码
                        </button>
                        <button
                          className="danger"
                          onClick={() => {
                            if (window.confirm(`确定删除 ${parent.displayName} 及其孩子、题库、练习记录吗？`)) {
                              deleteParentAccount(parent.id);
                              onChanged();
                            }
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {parents.length === 0 && (
                <tr>
                  <td colSpan={8}>还没有家长账号，请先新增。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
