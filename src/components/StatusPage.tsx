interface StatusPageProps {
  code: '403' | '404' | '410' | '500';
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}

export function StatusPage({ code, title, message, actionHref = '/', actionLabel = 'Back to SabHaven' }: StatusPageProps) {
  return (
    <main className="status-page" aria-labelledby="status-page-title">
      <p className="status-page__code">{code}</p>
      <h1 id="status-page-title">{title}</h1>
      <p>{message}</p>
      <a className="primary-button status-page__action" href={actionHref}>{actionLabel}</a>
    </main>
  );
}
