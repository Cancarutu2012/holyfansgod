import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("HolyFans Uncaught UI Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-neutral-900 border border-amber-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mx-auto mb-5 text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="font-cinzel text-2xl font-bold text-neutral-100 mb-2">
              Kisebb hiba történt a megjelenítéskor
            </h1>
            <p className="text-neutral-400 text-sm mb-6">
              {this.state.error?.message || "Nem sikerült betölteni a felületet. Kérjük frissítsd az oldalt!"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-all shadow-[0_0_20px_rgba(251,191,36,0.5)]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Oldal újratöltése</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
