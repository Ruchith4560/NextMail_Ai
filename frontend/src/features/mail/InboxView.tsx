import React, { useState } from 'react';
import { Star, Paperclip, Lock, Sparkles, Search, Zap } from 'lucide-react';
import { useMailStore } from '../../store/mailStore';
import { PriorityTier } from '../../types/mail';

export const InboxView: React.FC = () => {
  const {
    threads,
    selectedThreadId,
    setSelectedThreadId,
    toggleStar,
    markAsRead,
    searchQuery,
    searchResults,
    isSearching,
    searchEngine,
    searchTotal,
  } = useMailStore();
  const [activeTab, setActiveTab] = useState<'all' | 'priority' | 'unread'>('all');

  const isSearchActive = searchQuery.trim().length > 0;

  const filteredThreads = threads.filter((thread) => {
    if (activeTab === 'priority') return thread.priorityTier === 'URGENT' || thread.priorityTier === 'IMPORTANT';
    if (activeTab === 'unread') return !thread.isRead;
    return true;
  });

  const getPriorityBadge = (tier: PriorityTier) => {
    switch (tier) {
      case 'URGENT':
        return (
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            Urgent
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Important
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-[420px] min-w-[360px] bg-background border-r border-surface-border flex flex-col h-full select-none">
      {/* Control Header */}
      {isSearchActive ? (
        <div className="p-3 border-b border-surface-border flex items-center justify-between bg-primary-500/5">
          <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
            <Search className="w-3.5 h-3.5 text-primary-400" />
            <span>Search Results for "{searchQuery}"</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-primary-400 bg-surface px-1.5 py-0.5 rounded border border-surface-border">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{searchEngine === 'ELASTICSEARCH' ? 'ES 8.15' : 'Database'} ({searchTotal})</span>
          </div>
        </div>
      ) : (
        <div className="p-3 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-surface-border text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'all' ? 'bg-surface-active text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('priority')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'priority' ? 'bg-surface-active text-primary-300 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-accent-ai" />
              <span>Priority</span>
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'unread' ? 'bg-surface-active text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread
            </button>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {filteredThreads.length} conversation{filteredThreads.length === 1 ? '' : 's'}
          </div>
        </div>
      )}

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-border/50">
        {isSearchActive ? (
          isSearching ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span>Searching index...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
              <Search className="w-8 h-8 text-slate-500 mb-2 stroke-1" />
              <p className="text-xs font-medium text-slate-300">No matching emails found</p>
              <p className="text-[11px] text-slate-500 mt-1">Try query terms like 'Invoice', 'Retrospective', or 'AWS'</p>
            </div>
          ) : (
            searchResults.map((result) => {
              const isSelected = selectedThreadId === result.threadId;
              return (
                <div
                  key={result.messageId}
                  onClick={() => {
                    setSelectedThreadId(result.threadId);
                  }}
                  className={`p-3 cursor-pointer transition-colors relative group ${
                    isSelected
                      ? 'bg-surface-active/80 border-l-2 border-l-primary-500'
                      : 'bg-background hover:bg-surface-hover/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {result.senderName || result.senderEmail}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {result.score > 0 && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                          score: {result.score.toFixed(1)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(result.receivedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-100 font-medium truncate mb-1">
                    {result.subject}
                  </p>

                  <p
                    className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: result.highlightedSnippet || result.snippet }}
                  />

                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[9px] font-mono uppercase text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-surface-border">
                      {result.folder}
                    </span>
                    {result.hasAttachments && (
                      <span className="flex items-center gap-1 text-[9px] text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-surface-border">
                        <Paperclip className="w-2.5 h-2.5" />
                        <span>Attachment</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : (
          filteredThreads.map((thread) => {
            const isSelected = selectedThreadId === thread.id;
            return (
              <div
                key={thread.id}
                onClick={() => {
                  setSelectedThreadId(thread.id);
                  markAsRead(thread.id);
                }}
                className={`p-3 cursor-pointer transition-colors relative group ${
                  isSelected
                    ? 'bg-surface-active/80 border-l-2 border-l-primary-500'
                    : thread.isRead
                    ? 'bg-background hover:bg-surface-hover/50'
                    : 'bg-surface/30 hover:bg-surface-hover'
                }`}
              >
                {/* Top Row: Sender / Badges / Date */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(thread.id);
                      }}
                      className="text-slate-400 hover:text-amber-400 transition-colors"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          thread.isStarred ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>
                    <span
                      className={`text-xs truncate ${
                        thread.isRead ? 'text-slate-300 font-normal' : 'text-white font-semibold'
                      }`}
                    >
                      {thread.messages?.[0]?.sender.name || 'Unknown Sender'}
                    </span>
                    {thread.messageCount > 1 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({thread.messageCount})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {getPriorityBadge(thread.priorityTier)}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {thread.lastMessageAt}
                    </span>
                  </div>
                </div>

                {/* Subject */}
                <div className="flex items-center gap-1.5 mb-1">
                  <p
                    className={`text-xs truncate ${
                      thread.isRead ? 'text-slate-300' : 'text-slate-100 font-medium'
                    }`}
                  >
                    {thread.subject}
                  </p>
                </div>

                {/* Snippet */}
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {thread.snippet}
                </p>

                {/* Bottom Metadata Pills */}
                <div className="flex items-center gap-2 mt-2">
                  {thread.hasAttachments && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-surface-border">
                      <Paperclip className="w-2.5 h-2.5" />
                      <span>File</span>
                    </span>
                  )}
                  {thread.messages?.some((m) => m.isControlled) && (
                    <span className="flex items-center gap-1 text-[10px] text-accent-secure bg-accent-secure/10 px-1.5 py-0.5 rounded border border-accent-secure/20">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Controlled</span>
                    </span>
                  )}
                  {thread.labels.slice(0, 2).map((label) => (
                    <span
                      key={label}
                      className="text-[10px] text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-surface-border font-mono"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
