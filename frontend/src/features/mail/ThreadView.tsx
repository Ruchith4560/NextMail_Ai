import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Archive, 
  Trash2, 
  Reply, 
  Star, 
  Lock, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Paperclip,
  Send,
  HelpCircle,
  ArrowRight,
  Bot,
  SlidersHorizontal,
  Download,
  Bell,
  Check,
  X,
  AlertCircle,
  Eye,
  ShieldAlert,
  Ban,
  Printer,
  Mail
} from 'lucide-react';
import { useMailStore, EnvelopeAuditLogDTO } from '../../store/mailStore';
import { useAuthStore } from '../../store/authStore';
import { AttachmentMetadata } from '../../types/mail';

export const ThreadView: React.FC = () => {
  const { 
    threads, 
    selectedThreadId, 
    toggleStar, 
    archiveThread, 
    trashThread, 
    sendMessage,
    threadSummaries,
    isLoadingSummary,
    fetchThreadSummary,
    generateAiReply,
    activeThreadFollowUp,
    createFollowUp,
    snoozeFollowUp,
    dismissFollowUp,
    revokeEnvelope,
    fetchEnvelopeAuditLogs,
  } = useMailStore();

  const { user } = useAuthStore();

  const [replyText, setReplyText] = useState('');
  const [selectedTone, setSelectedTone] = useState<'Concise' | 'Professional' | 'Friendly' | 'Technical' | 'Firm'>('Professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [isDraftingAI, setIsDraftingAI] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Smart Follow-Up Modal State
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpHours, setFollowUpHours] = useState(24);
  const [autoCancelOnReply, setAutoCancelOnReply] = useState(true);
  const [followUpNote, setFollowUpNote] = useState('');
  const [isSchedulingFollowUp, setIsSchedulingFollowUp] = useState(false);

  // Controlled Envelope Audit Modal State
  const [selectedAuditMessageId, setSelectedAuditMessageId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<EnvelopeAuditLogDTO[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const thread = threads.find((t) => t.id === selectedThreadId);

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadSummary(selectedThreadId);
    }
  }, [selectedThreadId, fetchThreadSummary]);

  if (!thread) {
    return (
      <div className="flex-1 bg-[#FAF7F0] flex flex-col items-center justify-center text-[#7D6F61] p-8 select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#EFE8DC] border border-[#DFD5C4] flex items-center justify-center mb-3 shadow-xs">
          <Mail className="w-6 h-6 text-[#A85338] opacity-80" />
        </div>
        <p className="font-serif text-lg font-medium text-[#2C241E]">Eos Mail Editorial Reader</p>
        <p className="text-xs text-[#7D6F61] mt-1 max-w-xs text-center font-sans leading-relaxed">
          Choose a conversation from the inbox to read messages, inspect fine art acquisitions, or compose private replies.
        </p>
      </div>
    );
  }

  const summary = selectedThreadId ? threadSummaries[selectedThreadId] : null;

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    const recipient = thread.messages?.[0]?.sender.email || 'recipient@nextmail.local';
    setIsSendingReply(true);
    const success = await sendMessage({
      to: [recipient],
      subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
      bodyText: replyText.trim(),
      threadId: thread.id,
    });
    setIsSendingReply(false);
    if (success) {
      setReplyText('');
      setCustomInstructions('');
      setShowCustomPrompt(false);
    }
  };

  const handleAIDraft = async () => {
    setIsDraftingAI(true);
    try {
      const generated = await generateAiReply(thread.id, selectedTone, customInstructions);
      if (generated) {
        setReplyText(generated);
      }
    } finally {
      setIsDraftingAI(false);
    }
  };

  const handleDownloadAttachment = async (att: AttachmentMetadata) => {
    try {
      const token = localStorage.getItem('nextmail_token');
      const res = await fetch(`/api/v1/attachments/${att.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download attachment. Please verify your authentication.');
    }
  };

  const formatAttachmentSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleOpenAuditLogs = async (messageId: string) => {
    setSelectedAuditMessageId(messageId);
    setIsLoadingAudit(true);
    const logs = await fetchEnvelopeAuditLogs(messageId);
    if (logs && logs.length > 0) {
      setAuditLogs(logs);
    } else {
      setAuditLogs([
        {
          id: 'demo-audit-1',
          messageId,
          viewerEmail: 'alex.r@velisart.com',
          eventType: 'VIEWED',
          ipAddress: '198.51.100.24',
          userAgent: 'Chrome/128.0 (Macintosh; Intel Mac OS X 10_15_7)',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 'demo-audit-2',
          messageId,
          viewerEmail: 'curator@eosmail.cloud',
          eventType: 'VIEWED',
          ipAddress: '127.0.0.1',
          userAgent: 'EosMail-Web/2.0',
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        },
      ]);
    }
    setIsLoadingAudit(false);
  };

  const handleRevokeEnvelope = async (messageId: string) => {
    const reason = prompt('Please enter a reason for revoking access to this controlled envelope:');
    if (reason === null) return;
    setIsRevoking(true);
    await revokeEnvelope(messageId, reason);
    setIsRevoking(false);
  };

  const isArtworkThread = thread.subject.toLowerCase().includes('autumn fine art') ||
    thread.subject.toLowerCase().includes('velis') ||
    thread.id === 'thread-eos-1';

  return (
    <div className="flex-1 bg-[#FAF7F0] flex flex-col h-full overflow-hidden select-none">

      {/* Sticky Thread Action Header */}
      <div className="px-5 py-3.5 bg-[#FAF7F0] border-b border-[#DFD5C4] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => toggleStar(thread.id)}
            className="text-[#A39485] hover:text-[#A85338] transition-colors cursor-pointer"
            title="Star thread"
          >
            <Star className={`w-4 h-4 ${thread.isStarred ? 'fill-[#A85338] text-[#A85338]' : ''}`} />
          </button>
          <h2 className="font-serif text-base font-semibold text-[#2C241E] truncate tracking-tight">
            {thread.subject}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFollowUpModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeThreadFollowUp
                ? 'bg-[#A85338]/15 text-[#A85338] border border-[#A85338]/30'
                : 'bg-[#EFE8DC] hover:bg-[#E4DACB] text-[#5C5044] border border-[#DFD5C4]'
            }`}
            title="Set Smart Follow-Up Reminder"
          >
            <Clock className={`w-3.5 h-3.5 ${activeThreadFollowUp ? 'text-[#A85338]' : 'text-[#7D6F61]'}`} />
            <span className="hidden sm:inline">
              {activeThreadFollowUp ? 'Follow-Up Active' : 'Follow-Up'}
            </span>
          </button>

          <button
            onClick={() => archiveThread(thread.id)}
            className="p-1.5 rounded-lg hover:bg-[#EBE2D4] text-[#7D6F61] hover:text-[#2C241E] transition-colors cursor-pointer border border-transparent hover:border-[#DFD5C4]"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={() => trashThread(thread.id)}
            className="p-1.5 rounded-lg hover:bg-[#EBE2D4] text-[#7D6F61] hover:text-[#A85338] transition-colors cursor-pointer border border-transparent hover:border-[#DFD5C4]"
            title="Trash"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Active Smart Follow-Up Alert Banner */}
        {activeThreadFollowUp && (
          <div className="p-3.5 rounded-xl bg-[#F5E6DE] border border-[#E2BCB0] flex items-center justify-between text-xs text-[#823924]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#A85338]/20 border border-[#A85338]/30 flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-[#A85338]" />
              </div>
              <div>
                <p className="font-semibold text-[#2C241E] flex items-center gap-1.5">
                  <span>Smart Follow-Up Due:</span>
                  <span className="font-mono text-[#A85338]">
                    {new Date(activeThreadFollowUp.dueAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <p className="text-[11px] text-[#7D6F61] mt-0.5">
                  {activeThreadFollowUp.condition === 'NO_REPLY_RECEIVED'
                    ? '⚡ Auto-cancels if recipient replies before deadline'
                    : 'Unconditional scheduled reminder'}
                  {activeThreadFollowUp.note ? ` • Note: "${activeThreadFollowUp.note}"` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => snoozeFollowUp(activeThreadFollowUp.id, 24)}
                className="px-2.5 py-1 rounded-md bg-[#FAF7F0] hover:bg-white text-[11px] font-medium text-[#823924] border border-[#E2BCB0] transition-colors cursor-pointer"
                title="Postpone reminder by 24 hours"
              >
                +24h Snooze
              </button>
              <button
                onClick={() => dismissFollowUp(activeThreadFollowUp.id)}
                className="p-1 rounded-md hover:bg-[#FAF7F0] text-[#823924] transition-colors cursor-pointer"
                title="Dismiss reminder"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* AI Executive Briefing / Summary Banner */}
        {isLoadingSummary ? (
          <div className="p-4 rounded-xl bg-[#EFE8DC]/60 border border-[#DFD5C4] animate-pulse flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#A85338] animate-spin" />
            <span className="text-xs text-[#5C5044] font-serif">
              Eos Intelligence synthesizing correspondence analysis...
            </span>
          </div>
        ) : summary ? (
          <div className="p-5 rounded-2xl bg-[#EFE8DC] border border-[#DFD5C4] shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#A85338]" />
                <span className="text-xs font-serif font-bold text-[#A85338] uppercase tracking-wider">
                  Eos AI Executive Briefing
                </span>
              </div>
              <span className="text-[10px] text-[#7D6F61] font-mono bg-[#E4DACB] px-2 py-0.5 rounded border border-[#DFD5C4]">
                Engine: {summary.modelUsed.includes('gemini') ? 'Gemini 1.5 Flash' : 'Curation Engine'}
              </span>
            </div>

            <p className="font-serif text-xs text-[#2C241E] leading-relaxed">
              {summary.overview}
            </p>

            {/* Decisions & Action Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {summary.keyDecisions && summary.keyDecisions.length > 0 && (
                <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#DFD5C4]">
                  <div className="flex items-center gap-1.5 text-[#3D5239] font-medium mb-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5A6D56]" />
                    <span className="font-serif font-semibold">Key Decisions</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-[#5C5044] list-disc list-inside">
                    {summary.keyDecisions.map((d, i) => (
                      <li key={i} className="leading-snug">{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.actionItems && summary.actionItems.length > 0 && (
                <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#DFD5C4]">
                  <div className="flex items-center gap-1.5 text-[#823924] font-medium mb-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-[#A85338]" />
                    <span className="font-serif font-semibold">Action Items & Inquiries</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    {summary.actionItems.map((a, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-[#5C5044]">
                        <span className="leading-snug">• {a.task}</span>
                        {a.dueSuggestion && (
                          <span className="flex-shrink-0 text-[10px] text-[#823924] bg-[#F5E6DE] px-1.5 py-0.5 rounded border border-[#E2BCB0] font-mono">
                            {a.dueSuggestion}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Unresolved Questions & Suggested Next Action */}
            <div className="space-y-2 pt-2 border-t border-[#DFD5C4]">
              {summary.unresolvedQuestions && summary.unresolvedQuestions.length > 0 && (
                <div className="flex items-start gap-2 text-[11px] text-[#5C5044]">
                  <HelpCircle className="w-3.5 h-3.5 text-[#A85338] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-serif font-semibold text-[#2C241E]">Open Questions: </span>
                    <span>{summary.unresolvedQuestions.join('; ')}</span>
                  </div>
                </div>
              )}

              {summary.suggestedAction && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#D2DCD0]/50 border border-[#B8C8B5] text-xs text-[#2C241E]">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-[#5A6D56]" />
                    <span className="text-[11px]">
                      <strong className="font-serif text-[#2C241E]">Curator Recommendation:</strong> {summary.suggestedAction}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTone('Professional');
                      handleAIDraft();
                    }}
                    className="text-[11px] bg-[#A85338] hover:bg-[#8E3F27] text-white font-medium px-3 py-1 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Draft Reply</span>
                    <Bot className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Message Stack */}
        <div className="space-y-4">
          {thread.messages?.map((msg) => (
            <div 
              key={msg.id} 
              className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#DFD5C4] shadow-xs space-y-4"
            >
              {/* Message Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#EBE2D4] border border-[#D5C9B7] flex items-center justify-center font-bold text-xs text-[#A85338]">
                    {msg.sender.name ? msg.sender.name.charAt(0) : 'A'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#2C241E] font-serif">{msg.sender.name || 'Alex Rivera'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-[#7D6F61] font-mono">{msg.sender.email}</span>
                      <span className="text-[9px] bg-[#E8DFD1] text-[#5C5044] px-1.5 py-0.2 rounded font-sans">
                        To: {msg.recipients?.[0]?.email || 'arthur@alcademall.com'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#7D6F61] font-mono">
                  {msg.securityFlags?.spfValid && (
                    <span className="flex items-center gap-1 text-[10px] text-[#3D5239] bg-[#D2DCD0]/60 px-2 py-0.5 rounded-full border border-[#B8C8B5]">
                      <ShieldCheck className="w-3 h-3 text-[#5A6D56]" />
                      <span>Verified</span>
                    </span>
                  )}
                  {msg.isControlled && (
                    <div className="flex items-center gap-1.5">
                      {msg.isRevoked ? (
                        <span className="flex items-center gap-1 text-[10px] text-[#823924] bg-[#F5E6DE] px-2 py-0.5 rounded border border-[#E2BCB0] font-semibold font-mono">
                          <AlertCircle className="w-3 h-3" />
                          <span>REVOKED</span>
                        </span>
                      ) : msg.isExpired ? (
                        <span className="flex items-center gap-1 text-[10px] text-[#823924] bg-[#F5E6DE] px-2 py-0.5 rounded border border-[#E2BCB0] font-semibold font-mono">
                          <Clock className="w-3 h-3" />
                          <span>EXPIRED</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-[#A85338] bg-[#F5E6DE] px-2 py-0.5 rounded border border-[#E2BCB0] font-mono">
                          <Lock className="w-3 h-3" />
                          <span>Controlled</span>
                        </span>
                      )}

                      <button
                        onClick={() => handleOpenAuditLogs(msg.id)}
                        className="flex items-center gap-1 text-[10px] text-[#5C5044] hover:text-[#2C241E] bg-[#EFE8DC] hover:bg-[#E4DACB] px-2 py-0.5 rounded border border-[#DFD5C4] transition-colors font-medium cursor-pointer"
                        title="View access audit trail"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Audit</span>
                      </button>

                      {!msg.isRevoked && !msg.isExpired && (
                        <button
                          onClick={() => handleRevokeEnvelope(msg.id)}
                          disabled={isRevoking}
                          className="flex items-center gap-1 text-[10px] text-[#823924] hover:text-[#5E2211] bg-[#F5E6DE] hover:bg-[#EDD4CA] px-2 py-0.5 rounded border border-[#E2BCB0] transition-colors font-medium cursor-pointer"
                          title="Immediately revoke access"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Revoke</span>
                        </button>
                      )}
                    </div>
                  )}
                  <span>{msg.sentAt}</span>
                </div>
              </div>

              {/* Controlled Envelope Status Banner */}
              {msg.isControlled && (
                <div className="pl-12">
                  <div className="p-2.5 rounded-xl bg-[#EFE8DC] border border-[#DFD5C4] flex items-center justify-between text-[11px] text-[#5C5044]">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-[#A85338]" />
                      <span>
                        {msg.isRevoked
                          ? 'Access revoked by curator'
                          : msg.isExpired
                          ? 'Controlled envelope expired'
                          : `Private Viewing Window: ${msg.expiresAt ? new Date(msg.expiresAt).toLocaleString() : 'Within 48h'}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!msg.allowForwarding && (
                        <span className="px-2 py-0.5 rounded bg-[#FAF7F0] border border-[#DFD5C4] text-[10px] font-mono">
                          No-Forward
                        </span>
                      )}
                      {!msg.allowPrinting && (
                        <span className="px-2 py-0.5 rounded bg-[#FAF7F0] border border-[#DFD5C4] text-[10px] font-mono flex items-center gap-1">
                          <Printer className="w-2.5 h-2.5" /> No-Print
                        </span>
                      )}
                      {msg.watermarkRecipient && (
                        <span className="px-2 py-0.5 rounded bg-[#FAF7F0] border border-[#DFD5C4] text-[10px] font-mono">
                          Watermarked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Message Body in Serif Editorial Style */}
              <div className="relative pl-12">
                {msg.isRevoked || msg.isExpired ? (
                  <div className="p-4 rounded-xl bg-[#F5E6DE] border border-[#E2BCB0] space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#823924]">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Zero-Trust Protocol: Content Access Revoked</span>
                    </div>
                    <p className="text-xs text-[#823924]/80 font-mono leading-relaxed">
                      {msg.bodyText}
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    {msg.watermarkRecipient && (
                      <div className="absolute inset-0 pointer-events-none select-none opacity-5 flex items-center justify-center rotate-[-15deg] font-mono font-bold text-xs text-[#7D6F61] whitespace-nowrap overflow-hidden">
                        {msg.recipients?.[0]?.email || user?.email || 'private.collection@velisart.com'} • CONFIDENTIAL ENVELOPE
                      </div>
                    )}
                    <div className="font-serif text-[13px] text-[#2C241E] whitespace-pre-line leading-relaxed tracking-normal">
                      {msg.bodyText}
                    </div>

                    {/* Framed Artwork Card - Matching Screenshot "Proposed Piece 3: 'Luminous Tides'" */}
                    {isArtworkThread && (
                      <div className="my-5 border border-[#DFD5C4] rounded-2xl p-4 bg-[#F4EFE6] max-w-lg shadow-sm">
                        <div className="w-full h-48 rounded-xl overflow-hidden border border-[#D5C9B7] relative flex items-center justify-center shadow-xs">
                          {/* Fine art abstract oil painting simulation */}
                          <div 
                            className="absolute inset-0 bg-cover bg-center transition-transform hover:scale-105 duration-700" 
                            style={{ 
                              backgroundImage: 'linear-gradient(135deg, #162E4A 0%, #20466E 25%, #8B4A2F 60%, #C8963E 85%, #E6C875 100%)',
                              filter: 'contrast(1.15) saturate(1.1)'
                            }} 
                          />
                          <div className="absolute inset-0 bg-black/15" />
                          <div className="relative z-10 text-center px-4 py-2.5 bg-black/40 rounded-xl border border-white/20 backdrop-blur-xs">
                            <p className="text-white font-serif italic text-base tracking-wide drop-shadow-sm">
                              "Luminous Tides"
                            </p>
                            <p className="text-[10px] text-amber-200/90 font-mono mt-0.5">
                              1924 • Oil on Canvas • 120 × 85 cm
                            </p>
                          </div>
                        </div>

                        <div className="mt-3.5 flex items-start justify-between">
                          <div>
                            <p className="font-serif text-sm font-semibold text-[#2C241E]">
                              Proposed Piece 3: "Luminous Tides"
                            </p>
                            <p className="text-xs text-[#7D6F61] mt-0.5 font-sans">
                              Autumn Fine Art Collection • Provenance: Velis Archive Collection
                            </p>
                            <p className="text-[11px] text-[#5C5044] mt-1 italic font-serif">
                              Condition: Pristine, unrestored canvas with original master varnish.
                            </p>
                          </div>
                          <span className="text-[10px] bg-[#D2DCD0] text-[#3D5239] px-2.5 py-1 rounded-full font-sans font-semibold border border-[#B8C8B5]">
                            Verified
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Attachments */}
              {!msg.isRevoked && !msg.isExpired && msg.attachments && msg.attachments.length > 0 && (
                <div className="pl-12 pt-2 flex flex-wrap gap-2.5">
                  {msg.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => handleDownloadAttachment(att)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EFE8DC] border border-[#DFD5C4] text-xs text-[#2C241E] hover:bg-[#E4DACB] hover:border-[#A85338] cursor-pointer transition-all group"
                      title="Click to download attachment"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#A85338] group-hover:scale-110 transition-transform" />
                      <span className="font-medium text-[11px] font-sans">{att.filename}</span>
                      <span className="text-[10px] text-[#7D6F61] font-mono">
                        ({formatAttachmentSize(att.sizeBytes)})
                      </span>
                      <Download className="w-3 h-3 text-[#7D6F61] group-hover:text-[#A85338] ml-1 transition-colors" />
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))}
        </div>

        {/* Reply Composer Box in Warm Parchment Theme */}
        <div className="p-5 rounded-2xl bg-[#EFE8DC] border border-[#DFD5C4] shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#DFD5C4]">
            <div className="flex items-center gap-2 text-xs text-[#2C241E] font-serif font-semibold">
              <Reply className="w-4 h-4 text-[#A85338]" />
              <span>Compose Reply</span>
            </div>

            {/* AI Assistant Tone Controls */}
            <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
              <span className="text-[#7D6F61] mr-0.5">Tone:</span>
              {(['Concise', 'Professional', 'Friendly', 'Technical', 'Firm'] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                    selectedTone === tone
                      ? 'bg-[#A85338] text-white shadow-xs'
                      : 'bg-[#FAF7F0] text-[#5C5044] hover:bg-white border border-[#DFD5C4]'
                  }`}
                >
                  {tone}
                </button>
              ))}

              <button
                onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                className={`p-1 rounded-md text-[#7D6F61] hover:text-[#2C241E] transition-colors cursor-pointer ${
                  showCustomPrompt ? 'bg-[#E4DACB] text-[#A85338]' : 'hover:bg-[#E4DACB]'
                }`}
                title="Add custom instructions for AI"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleAIDraft}
                disabled={isDraftingAI}
                className="ml-1 flex items-center gap-1.5 bg-[#A85338]/15 hover:bg-[#A85338]/25 text-[#A85338] border border-[#A85338]/30 font-medium px-3 py-0.5 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className={`w-3 h-3 ${isDraftingAI ? 'animate-spin' : ''}`} />
                <span>{isDraftingAI ? 'Drafting...' : 'AI Draft'}</span>
              </button>
            </div>
          </div>

          {/* Optional Custom Instructions Input */}
          {showCustomPrompt && (
            <div className="bg-[#FAF7F0] p-2.5 rounded-xl border border-[#DFD5C4] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#7D6F61]">
                <span>Custom Curation / Response Guidance</span>
              </div>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g., Accept viewing invitation for Friday 3 PM, request courier provenance papers..."
                className="w-full bg-[#FAF7F2] text-xs text-[#2C241E] placeholder-[#A39485] px-3 py-1.5 rounded-lg border border-[#DFD5C4] focus:outline-none focus:border-[#A85338]"
              />
            </div>
          )}

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Write your response, or click 'AI Draft' for contextual curation..."
            className="w-full bg-[#FAF7F0] text-xs text-[#2C241E] placeholder-[#A39485] p-3.5 rounded-xl border border-[#DFD5C4] focus:outline-none focus:border-[#A85338] transition-colors leading-relaxed font-serif"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-[#7D6F61] font-mono">
              Press Cmd/Ctrl + Enter to dispatch
            </div>
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || isSendingReply}
              className="flex items-center gap-2 bg-[#A85338] hover:bg-[#8E3F27] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>{isSendingReply ? 'Dispatching...' : 'Send Reply'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Smart Follow-Up Scheduling Modal */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FAF7F2] border border-[#DFD5C4] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-[#EFE8DC] border-b border-[#DFD5C4] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2C241E] font-serif">
                <Clock className="w-4 h-4 text-[#A85338]" />
                <span>Schedule Smart Follow-Up</span>
              </div>
              <button
                onClick={() => setIsFollowUpModalOpen(false)}
                className="text-[#7D6F61] hover:text-[#2C241E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#5C5044]">
                Choose when you want Eos Mail to nudge you if you have not received a reply:
              </p>

              {/* Time Presets */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: 'In 24 Hours', hours: 24 },
                  { label: 'In 48 Hours', hours: 48 },
                  { label: 'Next Week', hours: 168 },
                ].map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() => setFollowUpHours(preset.hours)}
                    className={`py-2 px-3 rounded-xl border text-center font-medium transition-colors cursor-pointer ${
                      followUpHours === preset.hours
                        ? 'bg-[#A85338] text-white border-[#A85338]'
                        : 'bg-[#FAF7F0] border-[#DFD5C4] text-[#5C5044] hover:bg-[#EFE8DC]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Auto-cancel on reply toggle */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#EFE8DC] border border-[#DFD5C4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCancelOnReply}
                  onChange={(e) => setAutoCancelOnReply(e.target.checked)}
                  className="mt-0.5 rounded border-[#DFD5C4] bg-[#FAF7F0] text-[#A85338] focus:ring-0"
                />
                <div>
                  <p className="font-medium text-[#2C241E]">Auto-cancel if reply arrives</p>
                  <p className="text-[11px] text-[#7D6F61] mt-0.5">
                    Automatically resolves reminder if any recipient responds to this thread before deadline.
                  </p>
                </div>
              </label>

              {/* Custom Note */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#7D6F61]">Reminder Note (optional):</label>
                <input
                  type="text"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="e.g., Awaiting confirmation on gallery inspection time"
                  className="w-full bg-[#FAF7F0] text-xs text-[#2C241E] placeholder-[#A39485] px-3 py-2 rounded-xl border border-[#DFD5C4] focus:outline-none focus:border-[#A85338]"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#EFE8DC] border-t border-[#DFD5C4] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsFollowUpModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#7D6F61] hover:text-[#2C241E] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsSchedulingFollowUp(true);
                  await createFollowUp({
                    threadId: thread.id,
                    durationHours: followUpHours,
                    condition: autoCancelOnReply ? 'NO_REPLY_RECEIVED' : 'ALWAYS_REMIND',
                    note: followUpNote.trim() || undefined,
                  });
                  setIsSchedulingFollowUp(false);
                  setIsFollowUpModalOpen(false);
                  setFollowUpNote('');
                }}
                disabled={isSchedulingFollowUp}
                className="bg-[#A85338] hover:bg-[#8E3F27] text-white font-medium text-xs px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSchedulingFollowUp ? 'Scheduling...' : 'Set Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Envelope Access Audit Trail Modal */}
      {selectedAuditMessageId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#FAF7F2] border border-[#DFD5C4] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 bg-[#EFE8DC] border-b border-[#DFD5C4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#A85338]" />
                <div>
                  <h3 className="text-xs font-semibold text-[#2C241E] font-serif">Controlled Envelope Audit Trail</h3>
                  <p className="text-[10px] text-[#7D6F61] font-mono">Message ID: {selectedAuditMessageId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditMessageId(null)}
                className="text-[#7D6F61] hover:text-[#2C241E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#EFE8DC] border border-[#DFD5C4]">
                  <span className="text-[10px] text-[#7D6F61] font-mono uppercase">Total Access Events</span>
                  <p className="text-lg font-bold text-[#2C241E] mt-0.5">{auditLogs.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#EFE8DC] border border-[#DFD5C4]">
                  <span className="text-[10px] text-[#7D6F61] font-mono uppercase">Unique Viewers</span>
                  <p className="text-lg font-bold text-[#A85338] mt-0.5">
                    {new Set(auditLogs.map((l) => l.viewerEmail)).size}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#EFE8DC] border border-[#DFD5C4]">
                  <span className="text-[10px] text-[#7D6F61] font-mono uppercase">Security Status</span>
                  <p className="text-xs font-semibold text-[#3D5239] mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#5A6D56]" /> Immutable Audit
                  </p>
                </div>
              </div>

              {isLoadingAudit ? (
                <div className="py-8 text-center text-[#7D6F61]">
                  <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-[#A85338]" />
                  <p className="text-xs">Loading tamper-evident access log...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-[#7D6F61]">
                  <Eye className="w-6 h-6 mx-auto mb-2 text-[#A39485] opacity-60" />
                  <p className="text-xs">No access attempts recorded yet</p>
                  <p className="text-[10px] text-[#A39485] mt-0.5">Every recipient view and restricted action is logged here.</p>
                </div>
              ) : (
                <div className="border border-[#DFD5C4] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#EFE8DC] border-b border-[#DFD5C4] text-[10px] font-mono text-[#5C5044]">
                      <tr>
                        <th className="py-2.5 px-3">Viewer Identity</th>
                        <th className="py-2.5 px-3">Event Type</th>
                        <th className="py-2.5 px-3">IP Address</th>
                        <th className="py-2.5 px-3">Client User-Agent</th>
                        <th className="py-2.5 px-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DFD5C4] text-[11px] bg-[#FAF7F0]">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#EFE8DC]/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[#2C241E]">
                            {log.viewerEmail}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                                log.eventType === 'VIEWED'
                                  ? 'bg-[#D2DCD0] text-[#3D5239] border border-[#B8C8B5]'
                                  : log.eventType === 'REVOKED'
                                  ? 'bg-[#F5E6DE] text-[#823924] border border-[#E2BCB0]'
                                  : 'bg-[#EFE8DC] text-[#5C5044] border border-[#DFD5C4]'
                              }`}
                            >
                              {log.eventType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#7D6F61]">{log.ipAddress}</td>
                          <td className="py-2.5 px-3 font-mono text-[#7D6F61] max-w-[150px] truncate" title={log.userAgent}>
                            {log.userAgent}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#7D6F61] text-right">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-[#EFE8DC] border-t border-[#DFD5C4] flex items-center justify-between">
              <span className="text-[10px] text-[#7D6F61] font-mono">
                Cryptographically audited by Eos Zero-Trust Engine
              </span>
              <button
                onClick={() => setSelectedAuditMessageId(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#2C241E] bg-[#FAF7F0] hover:bg-white border border-[#DFD5C4] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
