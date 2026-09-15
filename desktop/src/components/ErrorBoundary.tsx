import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0D0F14] border border-[#262B38] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-neutral-200">
            <div className="flex items-center justify-between border-b border-[#1E232E] pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-sm text-neutral-100">
                  {this.props.fallbackTitle || 'Terjadi Masalah pada Komponen'}
                </h3>
              </div>
              {this.props.onClose && (
                <button
                  onClick={this.props.onClose}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Komponen mengalami kesalahan saat memproses data. Aplikasi tetap berjalan dan Anda dapat mencoba memuat ulang tampilan ini.
            </p>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-[#141822] border border-[#222938] text-[11px] font-mono text-red-400 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              {this.props.onClose && (
                <button
                  onClick={this.props.onClose}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 transition"
                >
                  Tutup
                </button>
              )}
              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
