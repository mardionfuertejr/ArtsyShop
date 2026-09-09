export default function EmptyState({
  icon = <i className="fa-solid fa-box-open" style={{ fontSize: '2.5rem', color: 'var(--color-text-muted)' }}></i>,
  title,
  message,
  action,
}) {
  return (
    <div className="empty-state fade-in">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <p className="empty-state-title">{title}</p>
      {message && <p className="empty-state-message">{message}</p>}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  );
}
