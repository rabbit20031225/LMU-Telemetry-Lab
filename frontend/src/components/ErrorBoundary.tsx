import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[10000] bg-[#0a0a0c] flex flex-col items-center justify-center p-6 font-sans">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative flex flex-col items-center max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
            {/* Top Shine */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mb-8 border border-red-500/30 animate-pulse">
              <AlertTriangle size={40} className="text-red-500" />
            </div>

            <h1 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-4 text-center">
              System Fault
            </h1>
            
            <p className="text-gray-400 text-sm text-center leading-relaxed mb-10 font-medium">
              The application encountered a critical rendering error. This usually happens due to massive data sync issues or minor code faults.
            </p>

            <div className="w-full p-4 bg-black/40 rounded-2xl border border-white/5 mb-10 font-mono text-[10px] text-red-400/80 break-all overflow-hidden max-h-24">
              Error: {this.state.error?.message || 'Unknown internal error'}
            </div>

            <button
              onClick={this.handleReload}
              className="w-full group relative flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] transition-all duration-300 shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:shadow-[0_0_50px_rgba(37,99,235,0.5)] active:scale-95"
            >
              <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
              <span>Restart System</span>
              
              {/* Internal Glow Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </button>
            
            <p className="mt-8 text-[9px] font-black uppercase tracking-[0.4em] text-gray-600">
              Antigravity Telemetry
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
