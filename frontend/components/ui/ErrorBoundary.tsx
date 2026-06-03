"use client";

import { Component, ReactNode } from "react";

interface Props { 
  children: ReactNode; 
  fallback?: ReactNode;
}
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
          <p className="text-lg font-semibold text-white mb-2">Something went wrong.</p>
          <button
            className="mt-4 px-4 py-2 bg-zinc-800 rounded-xl text-sm hover:bg-zinc-700 transition-colors"
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}