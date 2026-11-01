interface LoadingProps {
  label: string;
  detail?: string;
  /** Render on top of the current screen instead of taking the full viewport. */
  overlay?: boolean;
}

export default function Loading({ label, detail, overlay = false }: LoadingProps) {
  return (
    <div className={overlay ? 'loading-overlay' : 'loading'} role="status" aria-live="polite">
      <div className="loading-card">
        <div className="loading-spinner" aria-hidden="true">
          <span className="loading-ring" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M12 5v14" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <div className="loading-title">{label}</div>
        {detail && <div className="loading-detail">{detail}</div>}
      </div>
    </div>
  );
}
