import type { ReactNode } from "react";
import { AssetImage } from "./AssetImage";

export function AdventureCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`adventure-ui-card ${className}`.trim()}>{children}</section>;
}

export function FeatureEntryCard({
  title,
  description,
  image,
  imageAlt,
  tone = "cream",
  badge,
  onClick
}: {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  tone?: "cream" | "sky" | "green" | "purple" | "gold";
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`feature-entry-card tone-${tone}`} onClick={onClick}>
      {badge && <span className="feature-entry-badge">{badge}</span>}
      <AssetImage src={image} alt={imageAlt} className="feature-entry-art" />
      <span className="feature-entry-copy"><strong>{title}</strong><small>{description}</small></span>
      <span className="feature-entry-arrow" aria-hidden="true">›</span>
    </button>
  );
}

export function SummaryMetricCard({
  label,
  value,
  image,
  imageAlt
}: {
  label: string;
  value: ReactNode;
  image: string;
  imageAlt: string;
}) {
  return (
    <article className="summary-metric-card">
      <AssetImage src={image} alt={imageAlt} className="summary-metric-art" />
      <span><small>{label}</small><strong>{value}</strong></span>
    </article>
  );
}

export function AdventureAccordion({
  id,
  title,
  summary,
  image,
  imageAlt,
  open,
  onToggle,
  children
}: {
  id: string;
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`adventure-accordion ${open ? "is-open" : ""}`}>
      <button type="button" aria-expanded={open} aria-controls={`${id}-content`} onClick={onToggle}>
        <AssetImage src={image} alt={imageAlt} className="adventure-accordion-art" />
        <span><strong>{title}</strong><small>{summary}</small></span>
        <i aria-hidden="true">⌄</i>
      </button>
      <div id={`${id}-content`} className="adventure-accordion-content" hidden={!open}>{children}</div>
    </section>
  );
}

export function AdventureToggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="adventure-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span aria-hidden="true" />
      <em>{label}</em>
    </label>
  );
}

export function SettingRow({
  image,
  imageAlt,
  title,
  description,
  children
}: {
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="adventure-setting-row">
      <AssetImage src={image} alt={imageAlt} className="adventure-setting-icon" />
      <span className="adventure-setting-copy"><strong>{title}</strong><small>{description}</small></span>
      <span className="adventure-setting-control">{children}</span>
    </div>
  );
}
