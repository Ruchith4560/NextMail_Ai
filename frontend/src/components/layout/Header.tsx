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
        return <Mail className="w-3.5 h-3.5 text-[#A85338]" />;
      case 'FOLLOW_UP_DUE':
        return <Clock className="w-3.5 h-3.5 text-[#B87333]" />;
      case 'AI_SUMMARY_READY':
        return <Sparkles className="w-3.5 h-3.5 text-[#A85338]" />;
      case 'SECURITY_ALERT':
        return <ShieldAlert className="w-3.5 h-3.5 text-[#A85338]" />;
      case 'THREAD_PRIORITY_ESCALATED':
        return <Zap className="w-3.5 h-3.5 text-[#D48806]" />;
      default:
        return <Mail className="w-3.5 h-3.5 text-[#7D6F61]" />;
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
    <header className="h-13 bg-[#F5EFE6] border-b border-[#DFD5C4] flex items-center justify-between px-5 select-none relative z-40">
      {/* Search Bar / Natural Language Prompt */}
      <div className="flex-1 max-w-xl">
        <div className="relative flex items-center">
          {isSearching ? (
            <RefreshCw className="w-4 h-4 text-[#A85338] absolute left-3.5 animate-spin pointer-events-none" />
          ) : (
            <Search className="w-4 h-4 text-[#7D6F61] absolute left-3.5 pointer-events-none" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archive, fine art catalog, or ask Eos Intelligence..."
            className="w-full bg-[#FAF7F0] text-xs text-[#2C241E] placeholder-[#7D6F61] pl-10 pr-24 py-2 rounded-xl border border-[#DFD5C4] focus:outline-none focus:border-[#A85338] transition-all font-sans"
          />
          <div className="absolute right-3 flex items-center gap-1.5 pointer-events-auto">
            {searchQuery ? (
              <button
                onClick={clearSearch}
                className="text-[#7D6F61] hover:text-[#2C241E] p-0.5 rounded hover:bg-[#EFE8DC] transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-[#7D6F61] bg-[#EFE8DC] px-2 py-0.5 rounded-md border border-[#DFD5C4] font-mono pointer-events-none">
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
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFE8DC] border border-[#DFD5C4] text-xs font-mono text-[#5C5044]">
            <Zap className="w-3.5 h-3.5 text-[#A85338]" />
            <span>{searchEngine === 'ELASTICSEARCH' ? 'ES 8.15' : 'DB Engine'}: {searchTotal} found</span>
          </div>
        )}

        {/* IMAP Sync Trigger */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          title="Trigger On-Demand IMAP Sync"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFE8DC] hover:bg-[#E4DACB] border border-[#DFD5C4] text-xs font-medium text-[#5C5044] hover:text-[#2C241E] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#7D6F61] ${isSyncing ? 'animate-spin text-[#A85338]' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Live Notification Bell & Dropdown */}
        <div className="relative" ref={notificationDropdownRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            title="Real-Time Notifications"
            className={`relative p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
              isNotificationsOpen
                ? 'bg-[#E4DACB] border-[#A85338] text-[#A85338]'
                : 'bg-[#EFE8DC] hover:bg-[#E4DACB] border-[#DFD5C4] text-[#5C5044] hover:text-[#2C241E]'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#A85338] text-[10px] font-bold text-white shadow-xs ring-2 ring-[#F5EFE6]">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#FAF7F2] border border-[#DFD5C4] shadow-2xl overflow-hidden flex flex-col z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Dropdown Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#EFE8DC] border-b border-[#DFD5C4]">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-xs font-bold text-[#2C241E]">Live Feed</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#A85338]/15 border border-[#A85338]/30 text-[10px] font-mono text-[#A85338]">
                      {unreadNotificationsCount} new
                    </span>
                  )}
                </div>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-[11px] text-[#7D6F61] hover:text-[#A85338] transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#DFD5C4]">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[#7D6F61]">
                    <Bell className="w-6 h-6 mx-auto mb-2 text-[#A39485] opacity-60" />
                    <p className="text-xs font-serif">No notifications</p>
                    <p className="text-[11px] text-[#A39485] mt-0.5">Real-time alerts via STOMP broker will appear here</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                        item.isRead
                          ? 'bg-[#FAF7F0] hover:bg-[#EFE8DC]/80 opacity-75'
                          : 'bg-[#F4EFE6] hover:bg-[#EFE8DC]'
                      }`}
                    >
                      <div className="mt-0.5 p-1.5 rounded-lg bg-[#EFE8DC] border border-[#DFD5C4] shrink-0">
                        {getNotificationIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${item.isRead ? 'text-[#5C5044]' : 'text-[#2C241E] font-bold font-serif'}`}>
                            {item.title}
                          </p>
                          <span className="text-[10px] text-[#7D6F61] whitespace-nowrap font-mono">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7D6F61] line-clamp-2 mt-0.5 font-sans">
                          {item.message}
                        </p>
                      </div>
                      {!item.isRead && (
                        <div className="w-2 h-2 rounded-full bg-[#A85338] mt-1.5 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="px-4 py-2 bg-[#EFE8DC] border-t border-[#DFD5C4] text-[10px] text-[#7D6F61] flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3D5239]" />
                  STOMP WebSocket Active
                </span>
                <span>/topic/user/notifications</span>
              </div>
            </div>
          )}
        </div>

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#D2DCD0]/60 border border-[#B8C8B5] text-[11px] font-mono text-[#3D5239]">
          {backendStatus === 'UP' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5A6D56]" />
              <span className="font-semibold">Core API: 8080</span>
            </>
          ) : backendStatus === 'CHECKING' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-[#B87333] animate-spin" />
              <span className="text-[#B87333]">Connecting...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-[#A85338]" />
              <span className="text-[#A85338] font-semibold">Core Standby</span>
            </>
          )}
        </div>

        {/* AI Agent Ready Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#A85338]/10 border border-[#A85338]/25 text-[#A85338] text-xs font-serif font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Eos Intelligence Active</span>
        </div>
      </div>
    </header>
  );
};
