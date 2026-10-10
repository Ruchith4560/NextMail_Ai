import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { InboxView } from '../../features/mail/InboxView';
import { ThreadView } from '../../features/mail/ThreadView';
import { ComposeModal } from '../../features/mail/ComposeModal';
import { AuthModal } from '../auth/AuthModal';
import { useMailStore } from '../../store/mailStore';
import { useAuthStore } from '../../store/authStore';

export const AppLayout: React.FC = () => {
  const {
    setComposeOpen,
    threads,
    selectedThreadId,
    setSelectedThreadId,
    fetchNotifications,
    fetchUnreadNotificationsCount,
    initializeWebSocket,
  } = useMailStore();
  const { user, token, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user?.id && token) {
      fetchNotifications();
      fetchUnreadNotificationsCount();
      const cleanup = initializeWebSocket(user.id, token);
      return cleanup;
    }
  }, [user?.id, token, fetchNotifications, fetchUnreadNotificationsCount, initializeWebSocket]);

  // Keyboard shortcut listener ('c' for compose, 'j'/'k' for navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setComposeOpen(true);
      } else if (e.key === 'j') {
        e.preventDefault();
        const currentIndex = threads.findIndex((t) => t.id === selectedThreadId);
        if (currentIndex < threads.length - 1) {
          setSelectedThreadId(threads[currentIndex + 1].id);
        }
      } else if (e.key === 'k') {
        e.preventDefault();
        const currentIndex = threads.findIndex((t) => t.id === selectedThreadId);
        if (currentIndex > 0) {
          setSelectedThreadId(threads[currentIndex - 1].id);
        }
      } else if (e.key === 'Escape') {
        if (selectedThreadId) {
          setSelectedThreadId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [threads, selectedThreadId, setComposeOpen, setSelectedThreadId]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-hidden font-sans">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden relative">
          {/* Inbox View: Full width when no thread is selected; collapses to split master column on large screens when thread is selected */}
          <div 
            className={`h-full overflow-hidden transition-all duration-200 ${
              selectedThreadId 
                ? 'hidden lg:block lg:w-[420px] xl:w-[480px] border-r border-[#EAECF0] flex-shrink-0' 
                : 'w-full'
            }`}
          >
            <InboxView />
          </div>

          {/* Thread Reader Pane: visible when a thread is selected */}
          {selectedThreadId && (
            <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden animate-in fade-in duration-150">
              <ThreadView onBack={() => setSelectedThreadId(null)} />
            </div>
          )}
        </main>
      </div>
      <ComposeModal />
      <AuthModal />
    </div>
  );
};
