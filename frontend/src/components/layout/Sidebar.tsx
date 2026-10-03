import React from 'react';
import { 
  Inbox, 
  Send, 
  FileText, 
  Archive, 
  Trash2, 
  AlertOctagon, 
  Star, 
  ShieldCheck, 
  Lock, 
  Plus,
  Sparkles,
  LogOut,
  LogIn
} from 'lucide-react';
import { useMailStore } from '../../store/mailStore';
import { useAuthStore } from '../../store/authStore';
import { MailboxFolder } from '../../types/mail';

interface NavItem {
  id: MailboxFolder;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox, count: 2 },
  { id: 'starred', label: 'Starred', icon: Star, count: 2 },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText, count: 1 },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'spam', label: 'Spam', icon: AlertOctagon },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export const Sidebar: React.FC = () => {
  const { currentFolder, setCurrentFolder, setComposeOpen } = useMailStore();
  const { user, isAuthenticated, logout, setAuthModalOpen } = useAuthStore();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <aside className="w-64 bg-background-secondary border-r border-surface-border flex flex-col justify-between p-3 select-none">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-accent-ai flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-white">NextMail</span>
                <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 font-semibold border border-primary-500/30">
                  AI OS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Enterprise Edition</p>
            </div>
          </div>
        </div>

        {/* Compose Button */}
        <button
          onClick={() => setComposeOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white font-medium text-xs py-2 px-3 rounded-lg shadow-md transition-all duration-150 group"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          <span>New Message</span>
          <kbd className="ml-auto text-[10px] bg-primary-700/60 px-1.5 py-0.5 rounded text-primary-200 font-mono">C</kbd>
        </button>

        {/* Core Navigation */}
        <nav className="space-y-0.5">
          <div className="px-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Mailboxes
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentFolder === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentFolder(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-active text-white shadow-sm'
                    : 'text-slate-300 hover:bg-surface-hover hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count ? (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-primary-500 text-white' : 'bg-surface text-slate-400'
                  }`}>
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Intelligence & Controlled Envelopes */}
        <div className="pt-2 border-t border-surface-border space-y-1">
          <div className="px-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Specialized</span>
          </div>
          <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:bg-surface-hover hover:text-white">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-accent-secure" />
              <span>Controlled Envelopes</span>
            </div>
            <span className="text-[10px] text-accent-secure font-mono bg-accent-secure/10 px-1 rounded">E2EE</span>
          </button>
          <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:bg-surface-hover hover:text-white">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Phishing Radar</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1 rounded">Clean</span>
          </button>
        </div>
      </div>

      {/* Account / Session Footer */}
      <div className="pt-3 border-t border-surface-border">
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-surface-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary-600/30 text-primary-300 border border-primary-500/30 flex items-center justify-center font-bold text-xs">
                {getInitials(user.fullName || user.email)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{user.fullName || 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate font-mono">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Logout session"
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-surface transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-surface hover:bg-surface-hover text-slate-200 border border-surface-border font-medium text-xs py-2 px-3 rounded-lg transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-primary-400" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </aside>
  );
};
