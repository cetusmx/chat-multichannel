import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 overflow-auto rounded-lg border border-danger/40 bg-danger/10 p-5 text-fg">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-danger" aria-hidden />
            <h2 className="text-sm font-semibold">Algo salió mal</h2>
          </div>
          <details className="mt-3 whitespace-pre-wrap text-xs text-fg-muted">
            <summary className="cursor-pointer text-[13px] text-fg-muted hover:text-fg">Ver detalles</summary>
            <pre className="mt-2 overflow-auto font-mono text-[11px] leading-relaxed text-fg-subtle custom-scrollbar">
              {this.state.error ? String(this.state.error) : 'Sin mensaje de error'}
              {'\n'}
              {this.state.errorInfo && this.state.errorInfo.componentStack ? String(this.state.errorInfo.componentStack) : 'Sin traza'}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
