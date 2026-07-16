import { useEffect, useState } from "react";
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
  const [avatar, setAvatar] = useState<string | undefined>(child?.avatar);

  useEffect(() => {
    setName(child?.name ?? "");
    setGradeLevel(child?.gradeLevel ?? "grade1");
    setAvatar(child?.avatar);
  }, [child]);

  return (
    <form
      className="child-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, gradeLevel, avatar });
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
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>头像（可选）</legend>
        <div className="avatar-picker">
          <button
            type="button"
            className={`avatar-dot avatar-none ${avatar === undefined ? "selected" : ""}`}
            aria-label="不设置头像"
            onClick={() => setAvatar(undefined)}
          >
            无
          </button>
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
      <div className="form-actions">
        {onCancel && <button type="button" onClick={onCancel}>取消</button>}
        <button className="primary" type="submit">{child ? "保存" : "创建孩子档案"}</button>
      </div>
    </form>
  );
}
