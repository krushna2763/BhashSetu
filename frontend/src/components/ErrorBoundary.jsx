import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to service in production
    if (process.env.NODE_ENV === 'production') {
      // Here you would send error to logging service
      console.error('Error caught by boundary:', error, errorInfo);
    } else {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fdf8f0] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl border-2 border-red-200 p-8 text-center shadow-lg">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-[#1a3a6b] mb-2">
              कुछ गलत हुआ
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Something went wrong. Please refresh the page.
            </p>
            
            <button
              onClick={this.handleReset}
              className="bg-[#1a3a6b] text-white hover:bg-[#132a4d] rounded-full px-6 py-3 font-semibold transition-colors inline-flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto">
                  <p className="font-semibold mb-1">Error:</p>
                  <pre className="whitespace-pre-wrap">{this.state.error.toString()}</pre>
                  {this.state.errorInfo && (
                    <>
                      <p className="font-semibold mt-3 mb-1">Component Stack:</p>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
