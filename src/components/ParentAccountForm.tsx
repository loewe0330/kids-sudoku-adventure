import { useEffect, useState } from "react";
import type { ParentAccount, ParentAccountInput } from "../types";
import { PasswordField } from "./PasswordField";

interface ParentAccountFormProps {
  parent?: ParentAccount;
  onSubmit: (input: ParentAccountInput) => Promise<void> | void;
  onCancel: () => void;
}

export function ParentAccountForm({ parent, onSubmit, onCancel }: ParentAccountFormProps) {
  const [username, setUsername] = useState(parent?.username ?? "");
  const [displayName, setDisplayName] = useState(parent?.displayName ?? "");
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState(parent?.status !== "disabled");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setUsername(parent?.username ?? "");
    setDisplayName(parent?.displayName ?? "");
    setEnabled(parent?.status !== "disabled");
    setPassword("");
    setMessage("");
  }, [parent]);

  return (
    <form
      className="child-form"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await onSubmit({ username, displayName, password, enabled });
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "保存失败");
        }
      }}
    >
      <label>
        登录账号
        <input value={username} onChange={(event) => setUsername(event.target.value)} disabled={Boolean(parent)} />
      </label>
      <label>
        家长昵称
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      {!parent && (
        <PasswordField label="初始密码" value={password} onChange={setPassword} autoComplete="new-password" />
      )}
      <label className="toggle-row">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        启用账号
      </label>
      {message && <p className="result-note">{message}</p>}
      <div className="form-actions">
        <button type="button" onClick={onCancel}>取消</button>
        <button className="primary" type="submit">{parent ? "保存修改" : "创建家长账号"}</button>
      </div>
    </form>
  );
}
