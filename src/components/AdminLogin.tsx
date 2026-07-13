import { useEffect, useState } from "react";
import { initDefaultAdminIfNeeded, loginAdmin } from "../lib/storage";
import { AccountLayout } from "./AccountLayout";
import { PasswordField } from "./PasswordField";

interface AdminLoginProps {
  onLoggedIn: () => void;
  onParentLink: () => void;
}

export function AdminLogin({ onLoggedIn, onParentLink }: AdminLoginProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void initDefaultAdminIfNeeded();
  }, []);

  return (
    <AccountLayout title="管理者后台" subtitle="管理者创建、停用和维护测试版家长账号。">
      <section className="panel auth-panel">
        <form
          className="child-form"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await loginAdmin(username, password);
              onLoggedIn();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "登录失败");
            }
          }}
        >
          <label>
            管理员账号
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <PasswordField label="管理员密码" value={password} onChange={setPassword} autoComplete="current-password" />
          {message && <p className="result-note">{message}</p>}
          <button className="primary" type="submit">进入后台</button>
          <button type="button" onClick={onParentLink}>进入家长登录</button>
        </form>
      </section>
    </AccountLayout>
  );
}
