import React, { useEffect, useState, useRef } from 'react';
import {
  Search,
  Sparkles,
  Command,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
  Bell,
  Mail,
  Clock,
  ShieldAlert,
  CheckCheck,
} from 'lucide-react';
import { useMailStore, NotificationItem, NotificationType } from '../../store/mailStore';
import { apiClient } from '../../services/apiClient';

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    clearSearch,
    isSearching,
    searchEngine,
    searchTotal,
    fetchThreads,
    notifications,
    unreadNotificationsCount,
    isNotificationsOpen,
    setIsNotificationsOpen,
    markNotificationRead,
    markAllNotificationsRead,
    setSelectedThreadId,
  } = useMailStore();

  const [backendStatus, setBackendStatus] = useState<'UP' | 'DOWN' | 'CHECKING'>('CHECKING');
  const [isSyncing, setIsSyncing] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await apiClient.post('/mail/sync/imap');
    } catch {
      // Ignore if offline
    } finally {
      await fetchThreads();
      setIsSyncing(false);
    }
  };

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

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen, setIsNotificationsOpen]);

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'NEW_EMAIL':
        return <Mail className="w-3.5 h-3.5 text-[#00D084]" />;
      case 'FOLLOW_UP_DUE':
        return <Clock className="w-3.5 h-3.5 text-purple-500" />;
      case 'AI_SUMMARY_READY':
        return <Sparkles className="w-3.5 h-3.5 text-[#00D084]" />;
      case 'SECURITY_ALERT':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />;
      case 'THREAD_PRIORITY_ESCALATED':
        return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Mail className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    markNotificationRead(notification.id);
    if (notification.threadId) {
      setSelectedThreadId(notification.threadId);
      setIsNotificationsOpen(false);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-[#EAECF0] flex items-center justify-between px-6 select-none relative z-40 font-sans shadow-xs">
      
      {/* Title & View Switcher */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
            Mail Intelligence & Contact Center
          </h2>
          <p className="text-[10px] text-slate-500 font-mono">
            Automated Prioritization, Spam Quarantine & AI Executive Synthesis
          </p>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative flex items-center">
          {isSearching ? (
            <RefreshCw className="w-3.5 h-3.5 text-[#00D084] absolute left-3.5 animate-spin pointer-events-none" />
          ) : (
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 pointer-events-none" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mails, AI keywords, or senders (e.g. 'Jane Cooper', 'Database')..."
            className="w-full bg-[#F8FAFC] text-xs text-[#0F172A] placeholder-slate-400 pl-9 pr-20 py-2 rounded-xl border border-[#EAECF0] focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084]/30 transition-all"
          />
          <div className="absolute right-3 flex items-center gap-1.5 pointer-events-auto">
            {searchQuery ? (
              <button
                onClick={clearSearch}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono pointer-events-none">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center gap-3">
        {/* Search Engine Telemetry Badge */}
        {searchQuery && searchEngine && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>{searchEngine === 'ELASTICSEARCH' ? 'ES 8.15' : 'Core Index'}: {searchTotal} found</span>
          </div>
        )}

        {/* IMAP Sync Trigger */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          title="Trigger On-Demand IMAP Sync"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-[#00D084]' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Live Notification Bell & Dropdown */}
        <div className="relative" ref={notificationDropdownRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            title="Real-Time Notifications"
            className={`relative p-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              isNotificationsOpen
                ? 'bg-emerald-50 border-[#00D084] text-[#00D084]'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs ring-2 ring-white animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Dropdown Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0F172A]">Real-Time Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#00D084] text-[10px] font-mono font-bold">
                      {unreadNotificationsCount} new
                    </span>
                  )}
                </div>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#00D084] transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400">
                    <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">No notifications yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Alerts via STOMP broker will appear here</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                        item.isRead
                          ? 'bg-white hover:bg-slate-50 opacity-80'
                          : 'bg-emerald-50/40 hover:bg-emerald-50/80'
                      }`}
                    >
                      <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 shrink-0">
                        {getNotificationIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${item.isRead ? 'text-slate-700' : 'text-[#0F172A] font-bold'}`}>
                            {item.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {item.message}
                        </p>
                      </div>
                      {!item.isRead && (
                        <div className="w-2 h-2 rounded-full bg-[#00D084] mt-1.5 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="px-4 py-2 bg-[#F8FAFC] border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D084] animate-pulse" />
                  STOMP WebSocket Connected
                </span>
                <span>/topic/user/notifications</span>
              </div>
            </div>
          )}
        </div>

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/60 text-[11px] font-mono text-emerald-800">
          {backendStatus === 'UP' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00D084]" />
              <span className="font-semibold">Core: 8080</span>
            </>
          ) : backendStatus === 'CHECKING' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span className="text-amber-700">Connecting...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-rose-700 font-semibold">Standby</span>
            </>
          )}
        </div>

        {/* AI Agent Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#00D084] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#00D084]" />
          <span>Gemini 1.5 Flash</span>
        </div>

      </div>
    </header>
  );
};
