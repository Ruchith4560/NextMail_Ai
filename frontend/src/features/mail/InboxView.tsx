import React, { useState } from 'react';
import { 
  Search, 
  RotateCw, 
  SlidersHorizontal, 
  CheckSquare, 
  Square, 
  Paperclip, 
  Lock 
} from 'lucide-react';
import { useMailStore } from '../../store/mailStore';

export const InboxView: React.FC = () => {
  const {
    threads,
    selectedThreadId,
    setSelectedThreadId,
    markAsRead,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    fetchThreads,
  } = useMailStore();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const isSearchActive = searchQuery.trim().length > 0;

  const toggleSelectAll = () => {
    if (selectedItems.length === threads.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(threads.map((t) => t.id));
    }
  };

  const toggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-[360px] min-w-[320px] bg-[#F7F2EB] border-r border-[#DFD5C4] flex flex-col h-full select-none flex-shrink-0">
      {/* Top Search Bar (Sage green pill from reference) */}
      <div className="p-3 pb-2">
        <div className="relative flex items-center bg-[#D2DCD0] rounded-xl px-3 py-1.5 shadow-2xs">
          <Search className="w-3.5 h-3.5 text-[#5A6D56] mr-2 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent text-xs text-[#2C241E] placeholder-[#6E7F6A] focus:outline-none"
          />
        </div>
      </div>

      {/* Sub-Header Action Bar: Checkbox, Refresh, Reorder */}
      <div className="px-3 py-1.5 border-b border-[#DFD5C4] flex items-center justify-between text-[#7D6F61]">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="hover:text-[#2C241E] transition-colors cursor-pointer"
            title="Select all"
          >
            {selectedItems.length > 0 && selectedItems.length === threads.length ? (
              <CheckSquare className="w-3.5 h-3.5 text-[#A85338]" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => fetchThreads()}
            className="hover:text-[#2C241E] transition-colors cursor-pointer"
            title="Refresh inbox"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            className="hover:text-[#2C241E] transition-colors cursor-pointer"
            title="Sort & Filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-[10px] font-mono text-[#8C7E72]">
          {threads.length} conversations
        </span>
      </div>

      {/* Thread List Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#DFD5C4]/60">
        {isSearchActive ? (
          isSearching ? (
            <div className="p-8 text-center text-xs text-[#7D6F61] flex flex-col items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#A85338] border-t-transparent rounded-full animate-spin" />
              <span>Searching messages...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#7D6F61]">
              No messages found for "{searchQuery}"
            </div>
          ) : (
            searchResults.map((result) => {
              const isSelected = selectedThreadId === result.threadId;
              return (
                <div
                  key={result.messageId}
                  onClick={() => setSelectedThreadId(result.threadId)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#E8DFD1]' : 'hover:bg-[#EFE8DC]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="pt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A85338] block" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#2C241E] mb-0.5">
                        <span className="truncate">{result.senderName || result.senderEmail}</span>
                        <span className="text-[10px] text-[#8C7E72] font-mono">
                          {new Date(result.receivedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className={`text-xs font-medium truncate mb-1 ${isSelected ? 'text-[#A85338]' : 'text-[#4A3F35]'}`}>
                        {result.subject}
                      </p>
                      <p
                        className="text-[11px] text-[#7D6F61] line-clamp-2 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: result.highlightedSnippet || result.snippet }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          threads.map((thread) => {
            const isSelected = selectedThreadId === thread.id;
            const isChecked = selectedItems.includes(thread.id);
            const sender = thread.messages?.[0]?.sender.email || thread.messages?.[0]?.sender.name || 'alex.r@velisart.com';

            return (
              <div
                key={thread.id}
                onClick={() => {
                  setSelectedThreadId(thread.id);
                  markAsRead(thread.id);
                }}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#E8DFD1]'
                    : thread.isRead
                    ? 'bg-[#F7F2EB] hover:bg-[#EFE8DC]'
                    : 'bg-[#FAF6EF] hover:bg-[#EFE8DC]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleSelectItem(thread.id, e)}
                    className="pt-0.5 text-[#8C7E72] hover:text-[#2C241E] transition-colors cursor-pointer"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#A85338]" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Dot status indicator (Terracotta dot for unread/active) */}
                  <div className="pt-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full block ${
                        !thread.isRead || isSelected ? 'bg-[#A85338]' : 'bg-[#C4B7A7]'
                      }`}
                    />
                  </div>

                  {/* Content Container */}
                  <div className="flex-1 min-w-0">
                    {/* Sender Line */}
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-semibold text-[#2C241E] truncate">
                        {sender}
                      </span>
                      <span className="text-[10px] text-[#8C7E72] font-mono flex-shrink-0">
                        {thread.lastMessageAt}
                      </span>
                    </div>

                    {/* Subject Line (Terracotta for active or unread) */}
                    <p
                      className={`text-xs truncate mb-1 font-medium ${
                        isSelected || !thread.isRead ? 'text-[#A85338]' : 'text-[#4A3F35]'
                      }`}
                    >
                      {thread.subject}
                    </p>

                    {/* Snippet Line */}
                    <p className="text-[11px] text-[#7D6F61] line-clamp-2 leading-relaxed">
                      {thread.snippet}
                    </p>

                    {/* Optional Attachments / Security icons */}
                    {(thread.hasAttachments || thread.messages?.some((m) => m.isControlled)) && (
                      <div className="flex items-center gap-2 mt-1.5">
                        {thread.hasAttachments && (
                          <span className="flex items-center gap-1 text-[9px] text-[#7D6F61] bg-[#EAE1D3] px-1.5 py-0.5 rounded">
                            <Paperclip className="w-2.5 h-2.5" />
                            <span>Attachment</span>
                          </span>
                        )}
                        {thread.messages?.some((m) => m.isControlled) && (
                          <span className="flex items-center gap-1 text-[9px] text-[#5A6D56] bg-[#D2DCD0] px-1.5 py-0.5 rounded">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Encrypted</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
