import React, { useEffect, useState } from 'react';
import { Search, Sparkles, Command, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMailStore } from '../../store/mailStore';
import { apiClient } from '../../services/apiClient';

export const Header: React.FC = () => {
  const { searchQuery, setSearchQuery } = useMailStore();
  const [backendStatus, setBackendStatus] = useState<'UP' | 'DOWN' | 'CHECKING'>('CHECKING');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await apiClient.get<{ status: string }>('/health');
        if (res.data?.status === 'UP') {
          setBackendStatus('UP');
        } else {
          setBackendStatus('DOWN');
        }
      } catch {
        setBackendStatus('DOWN');
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-12 bg-background-secondary border-b border-surface-border flex items-center justify-between px-4 select-none">
      {/* Search Bar / Natural Language Prompt */}
      <div className="flex-1 max-w-xl">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, attachments, or ask NextMail AI (e.g. 'Invoices from Sarah in October')..."
            className="w-full bg-background text-xs text-slate-200 placeholder-slate-400 pl-9 pr-16 py-1.5 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
          />
          <div className="absolute right-2.5 flex items-center gap-1 text-[10px] text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-surface-border font-mono pointer-events-none">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center gap-3">
        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface/80 border border-surface-border text-[11px] font-mono">
          {backendStatus === 'UP' ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Core API: 8080</span>
            </>
          ) : backendStatus === 'CHECKING' ? (
            <>
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="text-amber-400">Connecting...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span className="text-rose-400 font-medium">Core Standby</span>
            </>
          )}
        </div>

        {/* AI Agent Ready Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-ai/10 border border-accent-ai/20 text-accent-ai text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini Reasoning Active</span>
        </div>
      </div>
    </header>
  );
};
