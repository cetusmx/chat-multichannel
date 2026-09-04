import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 m-4 overflow-auto">
          <h2 className="text-lg font-bold mb-2">Something went wrong.</h2>
          <details className="whitespace-pre-wrap text-sm">
            <summary>Show details</summary>
            {this.state.error ? String(this.state.error) : 'No error msg'}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack ? String(this.state.errorInfo.componentStack) : 'No stack'}
          </details>
        </div>
      );
    }
    return this.props.children; 
  }
}
