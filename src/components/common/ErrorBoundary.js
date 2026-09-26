'use client';

import React from 'react';

/**
 * Robust React Error Boundary
 * Eliminates Single Point of Failure (SPOF) by catching component rendering errors
 * and displaying a safe fallback instead of taking down the entire page.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Captured by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      if (this.props.silent) {
        return null;
      }
      return (
        <div style={{ padding: '16px', background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '12px', color: '#9F1239', fontSize: '0.85rem', margin: '12px 0' }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Something went wrong loading this section.</div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '6px', background: '#E11D48', color: '#FFF', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
