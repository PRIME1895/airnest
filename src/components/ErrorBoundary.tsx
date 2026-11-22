import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unexpected error occurred' };
  }

  override componentDidCatch(error: Error) {
    console.error('AirNest ErrorBoundary caught:', error.message);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center p-6 bg-[#F3F8F5] dark:bg-[#0B1612] text-[#122620] dark:text-[#EDF7F2]"
        >
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#13221C] border border-[#D8E8DF] dark:border-[#253F34] p-6 space-y-4">
            <h1 className="text-xl font-bold">Something went wrong in AirNest</h1>
            <p className="text-sm text-[#49635A] dark:text-[#A6C2B6] break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1B4D3E] text-white font-semibold hover:bg-[#143D30] transition-colors"
            >
              Reload AirNest
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
