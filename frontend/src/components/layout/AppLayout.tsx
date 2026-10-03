import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { InboxView } from '../../features/mail/InboxView';
import { ThreadView } from '../../features/mail/ThreadView';
import { ComposeModal } from '../../features/mail/ComposeModal';
import { useMailStore } from '../../store/mailStore';

export const AppLayout: React.FC = () => {
  const { setComposeOpen, threads, selectedThreadId, setSelectedThreadId } = useMailStore();

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [threads, selectedThreadId, setComposeOpen, setSelectedThreadId]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-slate-100 overflow-hidden font-sans">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          <InboxView />
          <ThreadView />
        </main>
      </div>
      <ComposeModal />
    </div>
  );
};
