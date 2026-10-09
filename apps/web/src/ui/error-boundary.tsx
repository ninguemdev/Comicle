import { Component, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  /** Shown instead of `children` once something under it throws while rendering. */
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  crashed: boolean;
}

/** Catches render errors below it; React still logs them to the console. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { crashed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { crashed: true };
  }

  override render(): ReactNode {
    return this.state.crashed ? this.props.fallback : this.props.children;
  }
}
