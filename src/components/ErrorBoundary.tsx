import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isConfigError = this.state.error?.message?.includes('not configured');

      return (
        <div className="min-h-screen bg-steel-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>

            <h1 className="text-2xl font-bold text-navy-600 mb-4">
              {isConfigError ? 'Application Configuration Required' : 'Something Went Wrong'}
            </h1>

            <p className="text-gray-700 mb-6">
              {isConfigError
                ? 'This application needs to be configured by your administrator. Please contact support for assistance.'
                : 'We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.'}
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-gray-700 mb-2">Need Help?</p>
              <p className="text-sm text-gray-600">
                Email: <a href="mailto:Contracting@teamFYM.com" className="text-navy-600 hover:underline">Contracting@teamFYM.com</a>
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-navy-600 text-white py-3 px-4 rounded-md hover:bg-navy-700 transition-colors font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
