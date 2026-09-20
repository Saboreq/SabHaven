import { Component, type ErrorInfo, type ReactNode } from 'react';

import { LEGAL_CONTACT_EMAIL } from '../lib/legal';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SabHaven UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="fatal-state error-boundary" role="alert">
        <p className="eyebrow">500 · Application error</p>
        <h1>Something went wrong</h1>
        <p>The interface could not finish loading. Refresh the page. If the problem continues, contact <a href={'mailto:' + LEGAL_CONTACT_EMAIL}>{LEGAL_CONTACT_EMAIL}</a>.</p>
        <div className="status-page__actions">
          <button className="primary-button" onClick={() => window.location.reload()} type="button">Reload</button>
          <a className="secondary-button" href="/">Back to SabHaven</a>
        </div>
      </main>
    );
  }
}
