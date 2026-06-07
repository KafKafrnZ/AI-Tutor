"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State { hasError: boolean; errorKey: number; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  handleReset = () => {
    // Increment errorKey forces React to unmount + remount children cleanly
    this.setState((prev) => ({ hasError: false, errorKey: prev.errorKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
          <p className="text-lg font-semibold text-white mb-2">Something went wrong.</p>
          <button
            className="mt-4 px-4 py-2 bg-zinc-800 rounded-xl text-sm hover:bg-zinc-700 transition-colors"
            onClick={this.handleReset}
          >
            Try Again
          </button>
        </div>
      );
    }
    return (
      // key change triggers full remount of children on reset
      <div key={this.state.errorKey}>{this.props.children}</div>
    );
  }
}