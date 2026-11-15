import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'अज्ञात त्रुटि (Unknown Error)',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('App ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage) as {
          error?: string;
          operationType?: string;
          path?: string;
        };
        if (parsed?.error) {
          friendlyMessage = `Firestore (${parsed.operationType || 'write'} @ ${parsed.path || 'db'}): ${parsed.error}`;
        }
      } catch {
        // non-JSON error message
      }

      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">
              सिस्टम में एक समस्या आई है
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed break-words">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>ऐप दोबारा लोड करें</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
