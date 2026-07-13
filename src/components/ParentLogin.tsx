import { useState } from "react";
import { loginParent } from "../lib/storage";
import { AccountLayout } from "./AccountLayout";
import { PasswordField } from "./PasswordField";

interface ParentLoginProps {
  onLoggedIn: () => void;
  onAdminLink: () => void;
}

export function ParentLogin({ onLoggedIn, onAdminLink }: ParentLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  return (
    <AccountLayout title="家长登录" subtitle="家长只能使用管理者提前创建的测试账号登录。">
      <section className="panel auth-panel">
        <form
          className="child-form"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await loginParent(username, password);
              onLoggedIn();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "登录失败");
            }
          }}
        >
          <label>
            家长账号
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <PasswordField label="密码" value={password} onChange={setPassword} autoComplete="current-password" />
          {message && <p className="result-note">{message}</p>}
          <div className="form-actions">
            <button className="primary" type="submit">登录</button>
            <button type="button" onClick={onAdminLink}>管理者登录</button>
          </div>
        </form>
      </section>
    </AccountLayout>
  );
}
