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
        return <Mail className="w-3.5 h-3.5 text-blue-400" />;
      case 'FOLLOW_UP_DUE':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'AI_SUMMARY_READY':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case 'SECURITY_ALERT':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'THREAD_PRIORITY_ESCALATED':
        return <Zap className="w-3.5 h-3.5 text-orange-400" />;
      default:
        return <Mail className="w-3.5 h-3.5 text-slate-400" />;
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
    <header className="h-12 bg-background-secondary border-b border-surface-border flex items-center justify-between px-4 select-none relative z-40">
      {/* Search Bar / Natural Language Prompt */}
      <div className="flex-1 max-w-xl">
        <div className="relative flex items-center">
          {isSearching ? (
            <RefreshCw className="w-4 h-4 text-primary-400 absolute left-3 animate-spin pointer-events-none" />
          ) : (
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, attachments, or ask NextMail AI (e.g. 'Invoices from Sarah in October')..."
            className="w-full bg-background text-xs text-slate-200 placeholder-slate-400 pl-9 pr-24 py-1.5 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
          />
          <div className="absolute right-2.5 flex items-center gap-1.5 pointer-events-auto">
            {searchQuery ? (
              <button
                onClick={clearSearch}
                className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-surface-border transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-surface-border font-mono pointer-events-none">
                <Command className="w-3 h-3" />
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
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary-500/10 border border-primary-500/30 text-xs font-mono text-primary-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{searchEngine === 'ELASTICSEARCH' ? 'ES 8.15' : 'DB Engine'}: {searchTotal} found</span>
          </div>
        )}

        {/* IMAP Sync Trigger */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          title="Trigger On-Demand IMAP Sync"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface hover:bg-surface-hover border border-surface-border text-xs text-slate-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 text-slate-400 ${isSyncing ? 'animate-spin text-primary-400' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Live Notification Bell & Dropdown */}
        <div className="relative" ref={notificationDropdownRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            title="Real-Time Notifications"
            className={`relative p-1.5 rounded-lg border transition-all ${
              isNotificationsOpen
                ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                : 'bg-surface hover:bg-surface-hover border-surface-border text-slate-300 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-surface border border-surface-border shadow-2xl shadow-black/60 overflow-hidden flex flex-col z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Dropdown Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-background-secondary border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">Live Push Feed</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-primary-500/20 border border-primary-500/40 text-[10px] font-mono text-primary-300">
                      {unreadNotificationsCount} new
                    </span>
                  )}
                </div>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-primary-300 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-surface-border/50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400">
                    <Bell className="w-6 h-6 mx-auto mb-2 text-slate-500 opacity-60" />
                    <p className="text-xs">No notifications yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Real-time alerts via STOMP broker will appear here</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`px-3.5 py-2.5 flex items-start gap-3 cursor-pointer transition-colors ${
                        item.isRead
                          ? 'bg-surface hover:bg-surface-hover/70 opacity-75'
                          : 'bg-primary-500/5 hover:bg-primary-500/10'
                      }`}
                    >
                      <div className="mt-0.5 p-1.5 rounded-lg bg-surface-border/60 shrink-0">
                        {getNotificationIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-medium truncate ${item.isRead ? 'text-slate-300' : 'text-white font-semibold'}`}>
                            {item.title}
                          </p>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                          {item.message}
                        </p>
                      </div>
                      {!item.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="px-3.5 py-1.5 bg-background-secondary border-t border-surface-border/50 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  STOMP WebSocket Connected
                </span>
                <span>/topic/user/notifications</span>
              </div>
            </div>
          )}
        </div>

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
