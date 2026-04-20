import React from "react";

interface State {
  error: Error | null;
}

/**
 * Top-level boundary so an unhandled render error becomes a recoverable
 * screen with a retry button, rather than a white page. Intentionally
 * scoped to the whole tree — any in-app re-navigation stays inside the
 * SPA, the "Reload" button is the hard-reset fallback.
 */
export default class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface to console so it shows up in production logs; a real app
    // would forward to Sentry / Datadog here.
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card p-6 space-y-4 text-center">
          <h1 className="text-lg font-bold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The app hit an unexpected error and couldn&apos;t finish rendering this view.
            Try again, or reload if the problem keeps happening.
          </p>
          <details className="text-left text-xs text-muted-foreground/70">
            <summary className="cursor-pointer select-none">Show error detail</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
          </details>
          <div className="flex gap-2 justify-center">
            <button type="button" onClick={this.handleReset} className="btn-ghost py-2 text-xs">
              Try again
            </button>
            <button type="button" onClick={this.handleReload} className="btn-primary py-2 text-xs">
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
