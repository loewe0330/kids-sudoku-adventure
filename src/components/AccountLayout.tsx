import type { ReactNode } from "react";

interface AccountLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AccountLayout({ title, subtitle, children }: AccountLayoutProps) {
  return (
    <main className="selector-page account-layout">
      <section className="selector-hero quest-hero">
        <p className="eyebrow">测试版账号系统</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <p className="warning-note">当前为测试版账号系统，请勿用于真实公网密码。</p>
      </section>
      {children}
    </main>
  );
}
