import { useId, useState } from "react";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
}

function EyeIcon({ off = false }: { off?: boolean }) {
  return (
    <svg className="password-eye-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2.8 12s3.3-5.2 9.2-5.2S21.2 12 21.2 12s-3.3 5.2-9.2 5.2S2.8 12 2.8 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="2" />
      {off && (
        <path
          d="M4.5 4.5 19.5 19.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function PasswordField({ label, value, onChange, autoComplete, disabled }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <label className="password-label" htmlFor={id}>
      <span>{label}</span>
      <span className="password-field">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={`${visible ? "隐藏" : "显示"}${label}`}
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
        >
          <EyeIcon off={visible} />
        </button>
      </span>
    </label>
  );
}
