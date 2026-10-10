import React, { useState } from 'react';
import { 
  Inbox, 
  Send, 
  FileText, 
  Trash2, 
  Flame, 
  Star, 
  Clock, 
  ShieldAlert, 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  Sliders, 
  Shield, 
  PenSquare,
  LogOut
} from 'lucide-react';
import { useMailStore } from '../../store/mailStore';
import { useAuthStore } from '../../store/authStore';

export const Sidebar: React.FC = () => {
  const { currentFolder, setCurrentFolder, setComposeOpen, threads, activeFollowUps } = useMailStore();
  const { user, isAuthenticated, logout, setAuthModalOpen } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  // Compute live badge counts
  const urgentCount = threads.filter((t) => t.priorityTier === 'URGENT' && !t.isSpam && !t.isTrash).length;
  const importantCount = threads.filter((t) => t.priorityTier === 'IMPORTANT' && !t.isSpam && !t.isTrash).length;
  const spamCount = threads.filter((t) => t.isSpam).length;
  const scheduledCount = activeFollowUps.length;

  return (
    <aside className="w-64 bg-[#0E1318] text-slate-300 border-r border-[#1E293B] flex flex-col justify-between p-4 select-none flex-shrink-0 h-full font-sans">
      <div className="space-y-5 overflow-y-auto pr-1">
        
        {/* Brand Header matching 'mojo cx' style in uploaded mockup */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00D084] to-[#10B981] flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="font-extrabold text-white text-base tracking-tighter">M</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-base tracking-tight">mojo</span>
                <span className="font-bold text-[#00D084] text-base tracking-tight">cx</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Contact Center AI</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#00D084] text-[10px] font-bold font-mono">
            v2.4
          </span>
        </div>

        {/* Primary Action Button: Compose Smart Mail */}
        <button
          onClick={() => setComposeOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-[#00D084] hover:bg-[#00B874] active:bg-[#009E64] text-[#0A100D] font-bold text-xs py-2.5 px-3.5 rounded-xl shadow-md shadow-emerald-500/15 transition-all duration-150 cursor-pointer"
        >
          <PenSquare className="w-4 h-4 text-[#0A100D]" strokeWidth={2.2} />
          <span>New Smart Mail</span>
        </button>

        {/* Priority & Workflow Folders */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Mail Operations
          </p>

          {/* All Mail / Inbox */}
          <button
            onClick={() => setCurrentFolder('inbox')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              currentFolder === 'inbox'
                ? 'bg-[#1A2530] text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:bg-[#161E26] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className={`w-4 h-4 ${currentFolder === 'inbox' ? 'text-[#00D084]' : 'text-slate-400'}`} />
              <span>Inbox & All Mail</span>
            </div>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300">
              {threads.filter((t) => !t.isTrash && !t.isSpam).length}
            </span>
          </button>

          {/* Urgent Priority */}
          <button
            onClick={() => setCurrentFolder('inbox')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-slate-400 hover:bg-[#161E26] hover:text-white`}
          >
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Urgent Attention</span>
            </div>
            {urgentCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                {urgentCount}
              </span>
            )}
          </button>

          {/* Important Priority */}
          <button
            onClick={() => setCurrentFolder('starred')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              currentFolder === 'starred'
                ? 'bg-[#1A2530] text-white font-semibold'
                : 'text-slate-400 hover:bg-[#161E26] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Important & Starred</span>
            </div>
            {importantCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold font-mono">
                {importantCount}
              </span>
            )}
          </button>

          {/* Scheduled Tasks / Follow-Ups */}
          <button
            onClick={() => setCurrentFolder('inbox')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-slate-400 hover:bg-[#161E26] hover:text-white`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Scheduled Tasks</span>
            </div>
            {scheduledCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-bold font-mono">
                {scheduledCount}
              </span>
            )}
          </button>

          {/* Spam & Quarantine */}
          <button
            onClick={() => setCurrentFolder('spam')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              currentFolder === 'spam'
                ? 'bg-[#1A2530] text-rose-300 font-semibold'
                : 'text-slate-400 hover:bg-[#161E26] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Spam & Quarantine</span>
            </div>
            {spamCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold font-mono">
                {spamCount}
              </span>
            )}
          </button>
        </div>

        {/* Standard Folders */}
        <div className="space-y-1 pt-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Standard Folders
          </p>

          <button
            onClick={() => setCurrentFolder('sent')}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              currentFolder === 'sent'
                ? 'bg-[#1A2530] text-white font-semibold'
                : 'text-slate-400 hover:bg-[#161E26] hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-slate-400" />
            <span>Sent Messages</span>
          </button>

          <button
            onClick={() => setCurrentFolder('drafts')}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              currentFolder === 'drafts'
                ? 'bg-[#1A2530] text-white font-semibold'
                : 'text-slate-400 hover:bg-[#161E26] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Drafts</span>
          </button>

          <button
            onClick={() => setCurrentFolder('trash')}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              currentFolder === 'trash'
                ? 'bg-[#1A2530] text-white font-semibold'
                : 'text-slate-400 hover:bg-[#161E26] hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Trash</span>
          </button>
        </div>

        {/* Settings Collapsible Dropdown matching screenshot */}
        <div className="space-y-1 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-[#00D084]" />
              <span>Settings</span>
            </div>
            {isSettingsOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
          </button>

          {isSettingsOpen && (
            <div className="pl-4 space-y-1 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#162127] text-white font-medium cursor-pointer">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D084]" />
                <span>User Management</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer hover:bg-[#161E26]">
                <Shield className="w-3 h-3 text-slate-400" />
                <span>Spam Shield Rules</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer hover:bg-[#161E26]">
                <Sliders className="w-3 h-3 text-slate-400" />
                <span>AI Prompt Controls</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* User Card matching "Kathryn Murphy - Product Admin" from image */}
      <div className="pt-3 border-t border-slate-800/80">
        <div className="p-2.5 rounded-2xl bg-[#161E26] border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 border border-emerald-400/30 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                {isAuthenticated && user?.fullName ? user.fullName.charAt(0) : 'K'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00D084] ring-2 ring-[#161E26]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {isAuthenticated && user?.fullName ? user.fullName : 'Kathryn Murphy'}
              </p>
              <p className="text-[10px] text-slate-400 truncate font-mono">
                {isAuthenticated && user?.role ? user.role : 'Product Admin'}
              </p>
            </div>
          </div>

          {isAuthenticated ? (
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-[10px] font-bold text-[#00D084] hover:text-emerald-300 font-mono px-2 py-1 rounded bg-[#00D084]/10 cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      </div>

    </aside>
  );
};
