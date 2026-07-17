import { useEffect, useState } from "react";
import { PasswordField } from "../../components/PasswordField";
import { AssetImage } from "../../components/ui/AssetImage";
import { AdventureToggle, SettingRow } from "../../components/ui/AdventurePrimitives";
import type { StorageSyncState } from "../../lib/storage";
import { updateCurrentParentPassword } from "../../lib/storage";
import { formatDateTime } from "../../lib/time";
import { getChildUiPreferences, setChildUiPreferences } from "../../lib/uiPreferences";
import type { ChildProfile, ChildSettings, PracticeMode } from "../../types";
import { sudokuAdventureAssets } from "../../ui/assets/sudokuAdventureAssets";

interface SettingsPageProps {
  child: ChildProfile;
  syncState: StorageSyncState;
  cloudEnabled: boolean;
  onSync: () => Promise<void>;
  onSettingsChange: (settings: ChildSettings) => void;
  onLogout: () => void;
}

export function SettingsPage({ child, syncState, cloudEnabled, onSync, onSettingsChange, onLogout }: SettingsPageProps) {
  const [uiPreferences, setUiPreferences] = useState(() => getChildUiPreferences(child.id));
  const [syncMessage, setSyncMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    document.body.classList.toggle("adventure-eye-care", uiPreferences.eyeCare);
    return () => document.body.classList.remove("adventure-eye-care");
  }, [uiPreferences.eyeCare]);

  const updateUiPreference = (key: keyof typeof uiPreferences, value: boolean) => {
    const next = { ...uiPreferences, [key]: value };
    setUiPreferences(next);
    setChildUiPreferences(child.id, next);
  };
  const updateSetting = <Key extends keyof ChildSettings>(key: Key, value: ChildSettings[Key]) => {
    onSettingsChange({ ...child.settings, [key]: value });
  };
  const syncLabel = syncState.status === "error"
    ? "同步暂不可用"
    : syncState.message ?? (cloudEnabled ? "学习数据已同步" : "当前为本地模式");

  return (
    <main className="adventure-settings-page map-shell" aria-labelledby="adventure-settings-title">
      <section className="settings-title-sign">
        <AssetImage src={sudokuAdventureAssets.settings.titleSign} alt="森林设置木牌" loading="eager" />
        <div><p>探险装备</p><h2 id="adventure-settings-title">设置页</h2></div>
      </section>

      <section className={`settings-sync-card sync-${syncState.status}`} aria-live="polite">
        <AssetImage src={sudokuAdventureAssets.settings.syncStatusPanel} alt="云同步状态插画" className="settings-sync-art" />
        <div className="settings-sync-copy">
          <p>账户与同步状态</p><strong>{syncLabel}</strong>
          <span>{syncState.status === "error" ? "学习记录仍保存在当前设备，可稍后重试。" : `最后同步：${formatDateTime(syncState.lastSyncedAt)}`}</span>
        </div>
        <button type="button" className="primary settings-sync-button" aria-label={syncState.status === "error" ? "重新同步" : "同步数据"} disabled={!cloudEnabled || syncState.status === "syncing"} onClick={() => {
          setSyncMessage("");
          void onSync().then(() => setSyncMessage("同步完成")).catch(() => setSyncMessage("同步失败，请稍后再试"));
        }}><span aria-hidden="true">↻</span>{syncState.status === "syncing" ? "同步中" : "立即同步"}</button>
        {syncMessage && <p className="settings-inline-message" role="status">{syncMessage}</p>}
      </section>

      <section className="adventure-settings-list" aria-label="设置列表">
        <SettingRow image={sudokuAdventureAssets.settings.music} imageAlt="音乐音符" title="声音与音乐" description="开启答题音效与提示声音">
          <AdventureToggle label="声音与音乐" checked={child.settings.soundEnabled} onChange={(value) => updateSetting("soundEnabled", value)} />
        </SettingRow>
        <SettingRow image={sudokuAdventureAssets.settings.eyeCare} imageAlt="护眼模式" title="护眼模式" description="使用柔和颜色，减少视觉刺激">
          <AdventureToggle label="护眼模式" checked={uiPreferences.eyeCare} onChange={(value) => updateUiPreference("eyeCare", value)} />
        </SettingRow>
        <SettingRow image={sudokuAdventureAssets.settings.vibration} imageAlt="震动反馈" title="震动反馈" description="操作与提示时提供轻触反馈">
          <AdventureToggle label="震动反馈" checked={uiPreferences.vibration} onChange={(value) => updateUiPreference("vibration", value)} />
        </SettingRow>
        <SettingRow image={sudokuAdventureAssets.settings.cloudSync} imageAlt="数据同步" title="数据同步" description={cloudEnabled ? "跨设备保存学习记录与闯关进度" : "登录云账号后可跨设备同步"}>
          <button type="button" className="settings-row-action" disabled={!cloudEnabled} onClick={() => void onSync()}>同步 <span aria-hidden="true">›</span></button>
        </SettingRow>
        <SettingRow image={sudokuAdventureAssets.settings.reminder} imageAlt="学习提醒" title="学习提醒" description="保留每天练习的好习惯">
          <AdventureToggle label="学习提醒" checked={uiPreferences.reminder} onChange={(value) => updateUiPreference("reminder", value)} />
        </SettingRow>
        <SettingRow image={sudokuAdventureAssets.settings.difficulty} imageAlt="题目难度" title="题目难度说明" description="查看模式、计时和纠错设置">
          <details className="settings-row-details"><summary aria-label="展开题目难度设置">›</summary><div>
            <label>练习模式<select value={child.settings.practiceMode} onChange={(event) => updateSetting("practiceMode", event.target.value as PracticeMode)}><option value="practice">练习</option><option value="adventure">闯关</option><option value="challenge">挑战</option></select></label>
            <AdventureToggle label="显示计时器" checked={child.settings.showTimer} onChange={(value) => updateSetting("showTimer", value)} />
            <AdventureToggle label="即时错误反馈" checked={child.settings.immediateErrorFeedback} onChange={(value) => updateSetting("immediateErrorFeedback", value)} />
          </div></details>
        </SettingRow>
        <SettingRow image={sudokuAdventureAssets.settings.rewards} imageAlt="奖励与动画" title="奖励与动画" description="控制通关庆祝和动态效果">
          <details className="settings-row-details"><summary aria-label="展开奖励与动画设置">›</summary><div>
            <AdventureToggle label="成功动画" checked={child.settings.successAnimationEnabled} onChange={(value) => updateSetting("successAnimationEnabled", value)} />
            <AdventureToggle label="减少动画" checked={child.settings.reducedMotion} onChange={(value) => updateSetting("reducedMotion", value)} />
          </div></details>
        </SettingRow>
        <SettingRow image={sudokuAdventureAssets.settings.about} imageAlt="关于我们" title="关于我们" description="版本信息与家长账户设置">
          <details className="settings-row-details settings-about-details"><summary aria-label="展开关于我们">›</summary><div>
            <p>数独探险家 · 儿童分级数独训练</p>
            <form onSubmit={async (event) => {
              event.preventDefault();
              if (newPassword !== confirmPassword) { setPasswordMessage("两次密码不一致。"); return; }
              try {
                await updateCurrentParentPassword(currentPassword, newPassword);
                setPasswordMessage("家长密码已修改。");
                setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
              } catch (error) {
                setPasswordMessage(error instanceof Error ? error.message : "修改失败");
              }
            }}>
              <PasswordField label="当前密码" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
              <PasswordField label="新密码" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
              <PasswordField label="确认新密码" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
              <button className="primary" type="submit">修改密码</button>
            </form>
            {passwordMessage && <p role="status">{passwordMessage}</p>}
          </div></details>
        </SettingRow>
      </section>

      <footer className="settings-logout-footer">
        <button type="button" className="danger settings-logout-button" onClick={onLogout}><span aria-hidden="true">↪</span>退出登录</button>
      </footer>
    </main>
  );
}
