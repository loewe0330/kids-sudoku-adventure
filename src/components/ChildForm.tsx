import { useEffect, useState } from "react";
import { gradeDefaultLevels } from "../constants/difficultyLevels";
import { gradeOptions } from "../constants/gradeLabels";
import type { ChildProfile, ChildProfileInput } from "../types";

interface ChildFormProps {
  child?: ChildProfile;
  onSubmit: (input: ChildProfileInput) => void;
  onCancel?: () => void;
}

const avatars = ["sun", "star", "leaf", "moon", "heart"];

export function ChildForm({ child, onSubmit, onCancel }: ChildFormProps) {
  const [name, setName] = useState(child?.name ?? "");
  const [gradeLevel, setGradeLevel] = useState(child?.gradeLevel ?? "grade1");
  const [avatar, setAvatar] = useState(child?.avatar ?? avatars[0]);
  const [smartDifficultyEnabled, setSmartDifficultyEnabled] = useState(child?.smartDifficultyEnabled ?? true);

  useEffect(() => {
    setName(child?.name ?? "");
    setGradeLevel(child?.gradeLevel ?? "grade1");
    setAvatar(child?.avatar ?? avatars[0]);
    setSmartDifficultyEnabled(child?.smartDifficultyEnabled ?? true);
  }, [child]);

  return (
    <form
      className="child-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, gradeLevel, avatar, smartDifficultyEnabled });
      }}
    >
      <label>
        孩子昵称
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：安安" />
      </label>
      <label>
        年级
        <select value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value as typeof gradeLevel)}>
          {gradeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} · 默认 L{gradeDefaultLevels[option.value]}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>头像颜色</legend>
        <div className="avatar-picker">
          {avatars.map((item) => (
            <button
              type="button"
              className={`avatar-dot avatar-${item} ${avatar === item ? "selected" : ""}`}
              key={item}
              aria-label={item}
              onClick={() => setAvatar(item)}
            />
          ))}
        </div>
      </fieldset>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={smartDifficultyEnabled}
          onChange={(event) => setSmartDifficultyEnabled(event.target.checked)}
        />
        开启智能难度
      </label>
      <div className="form-actions">
        {onCancel && <button type="button" onClick={onCancel}>取消</button>}
        <button className="primary" type="submit">{child ? "保存" : "创建孩子"}</button>
      </div>
    </form>
  );
}
