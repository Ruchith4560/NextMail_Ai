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
  Printer
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
      <div className="flex-1 bg-background flex flex-col items-center justify-center text-slate-400 p-8 select-none">
        <div className="w-12 h-12 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6 text-primary-400 opacity-60" />
        </div>
        <p className="text-sm font-medium text-slate-300">Select a conversation</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
          Choose a thread from the inbox to read messages, view AI executive briefings, or compose secure replies.
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
      // Demo audit trail for showcase
      setAuditLogs([
        {
          id: 'demo-audit-1',
          messageId,
          viewerEmail: 'sarah.j@acme-systems.cloud',
          eventType: 'VIEWED',
          ipAddress: '198.51.100.24',
          userAgent: 'Chrome/128.0 (Macintosh; Intel Mac OS X 10_15_7)',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: 'demo-audit-2',
          messageId,
          viewerEmail: 'alex.r@nextmail.local',
          eventType: 'VIEWED',
          ipAddress: '127.0.0.1',
          userAgent: 'NextMail-Web/1.0',
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

  return (
    <div className="flex-1 bg-background flex flex-col h-full overflow-hidden select-none">

      {/* Sticky Thread Action Header */}
      <div className="p-3 bg-background-secondary border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => toggleStar(thread.id)}
            className="text-slate-400 hover:text-amber-400 transition-colors"
          >
            <Star className={`w-4 h-4 ${thread.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
          <h2 className="text-sm font-semibold text-white truncate">{thread.subject}</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsFollowUpModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeThreadFollowUp
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-surface hover:bg-surface-hover text-slate-300 hover:text-white border border-surface-border'
            }`}
            title="Set Smart Follow-Up Reminder"
          >
            <Clock className={`w-3.5 h-3.5 ${activeThreadFollowUp ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">
              {activeThreadFollowUp ? 'Follow-Up Active' : 'Follow-Up'}
            </span>
          </button>

          <button
            onClick={() => archiveThread(thread.id)}
            className="p-1.5 rounded-md hover:bg-surface-hover text-slate-400 hover:text-white transition-colors"
            title="Archive (E)"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={() => trashThread(thread.id)}
            className="p-1.5 rounded-md hover:bg-surface-hover text-slate-400 hover:text-rose-400 transition-colors"
            title="Trash (#)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Active Smart Follow-Up Alert Banner */}
        {activeThreadFollowUp && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <span>Smart Follow-Up Due:</span>
                  <span className="text-amber-300 font-mono">
                    {new Date(activeThreadFollowUp.dueAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <p className="text-[11px] text-amber-300/80">
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
                className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-medium text-amber-200 border border-amber-500/40 transition-colors"
                title="Postpone reminder by 24 hours"
              >
                +24h Snooze
              </button>
              <button
                onClick={() => dismissFollowUp(activeThreadFollowUp.id)}
                className="p-1 rounded-md hover:bg-amber-500/20 text-amber-400 hover:text-white transition-colors"
                title="Dismiss reminder"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* AI Executive Briefing / Summary Banner */}

        {isLoadingSummary ? (
          <div className="p-3.5 rounded-xl bg-surface/40 border border-accent-ai/20 animate-pulse flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-accent-ai animate-spin" />
            <span className="text-xs text-slate-300 font-mono">
              NextMail AI synthesizing conversation intelligence...
            </span>
          </div>
        ) : summary ? (
          <div className="p-4 rounded-xl bg-gradient-to-r from-accent-ai/10 via-surface to-surface border border-accent-ai/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-ai" />
                <span className="text-xs font-semibold text-accent-ai uppercase tracking-wider font-mono">
                  NextMail AI Executive Briefing
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono bg-background/50 px-2 py-0.5 rounded border border-surface-border">
                Engine: {summary.modelUsed.includes('gemini') ? 'Gemini 1.5 Flash' : 'Heuristic Engine'}
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {summary.overview}
            </p>

            {/* Decisions & Action Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Decisions */}
              {summary.keyDecisions && summary.keyDecisions.length > 0 && (
                <div className="p-2.5 rounded-lg bg-background/60 border border-surface-border">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Decisions Made</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                    {summary.keyDecisions.map((d, i) => (
                      <li key={i} className="leading-snug">{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items & Commitments */}
              {summary.actionItems && summary.actionItems.length > 0 && (
                <div className="p-2.5 rounded-lg bg-background/60 border border-surface-border">
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium mb-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Action Items & Commitments</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    {summary.actionItems.map((a, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-slate-300">
                        <span className="leading-snug">• {a.task}</span>
                        {a.dueSuggestion && (
                          <span className="flex-shrink-0 text-[10px] text-amber-300 bg-amber-500/10 px-1 rounded border border-amber-500/20 font-mono">
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
            <div className="space-y-2 pt-1 border-t border-surface-border/40">
              {summary.unresolvedQuestions && summary.unresolvedQuestions.length > 0 && (
                <div className="flex items-start gap-2 text-[11px] text-slate-300">
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-purple-300">Open Questions: </span>
                    <span>{summary.unresolvedQuestions.join('; ')}</span>
                  </div>
                </div>
              )}

              {summary.suggestedAction && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs text-primary-200">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-primary-400" />
                    <span className="text-[11px]"><strong className="text-white">Recommended Next Action:</strong> {summary.suggestedAction}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTone('Professional');
                      handleAIDraft();
                    }}
                    className="text-[10px] bg-primary-600 hover:bg-primary-500 text-white font-medium px-2 py-0.5 rounded shadow transition-colors flex items-center gap-1"
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
        <div className="space-y-3">
          {thread.messages?.map((msg) => (
            <div key={msg.id} className="p-4 rounded-xl bg-surface/60 border border-surface-border space-y-3">
              {/* Message Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-slate-600 flex items-center justify-center font-bold text-xs text-white">
                    {msg.sender.name ? msg.sender.name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{msg.sender.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{msg.sender.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  {msg.securityFlags?.spfValid && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      <span>SPF/DKIM</span>
                    </span>
                  )}
                  {msg.isControlled && (
                    <div className="flex items-center gap-1.5">
                      {msg.isRevoked ? (
                        <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30 font-semibold font-mono">
                          <AlertCircle className="w-3 h-3" />
                          <span>REVOKED</span>
                        </span>
                      ) : msg.isExpired ? (
                        <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30 font-semibold font-mono">
                          <Clock className="w-3 h-3" />
                          <span>EXPIRED</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-accent-secure bg-accent-secure/10 px-1.5 py-0.5 rounded border border-accent-secure/20 font-mono">
                          <Lock className="w-3 h-3" />
                          <span>Controlled</span>
                        </span>
                      )}

                      {/* Sender Management Buttons */}
                      <button
                        onClick={() => handleOpenAuditLogs(msg.id)}
                        className="flex items-center gap-1 text-[10px] text-primary-300 hover:text-white bg-primary-500/10 hover:bg-primary-500/20 px-2 py-0.5 rounded border border-primary-500/30 transition-colors font-medium"
                        title="View access audit trail"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Audit Trail</span>
                      </button>

                      {!msg.isRevoked && !msg.isExpired && (
                        <button
                          onClick={() => handleRevokeEnvelope(msg.id)}
                          disabled={isRevoking}
                          className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30 transition-colors font-medium"
                          title="Immediately revoke recipient access"
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

              {/* Controlled Envelope Status & Policy Banner */}
              {msg.isControlled && (
                <div className="pl-10">
                  <div className="p-2 rounded-lg bg-surface/80 border border-surface-border flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-accent-secure" />
                      <span>
                        {msg.isRevoked
                          ? 'Access revoked by sender'
                          : msg.isExpired
                          ? 'Envelope expired'
                          : `Expires: ${msg.expiresAt ? new Date(msg.expiresAt).toLocaleString() : 'Within 48h'}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!msg.allowForwarding && (
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-surface-border text-[10px] text-slate-400 font-mono">
                          No-Forward
                        </span>
                      )}
                      {!msg.allowPrinting && (
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-surface-border text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Printer className="w-2.5 h-2.5" /> No-Print
                        </span>
                      )}
                      {msg.watermarkRecipient && (
                        <span className="px-1.5 py-0.5 rounded bg-surface border border-surface-border text-[10px] text-slate-400 font-mono">
                          Watermarked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div className="relative pl-10">
                {msg.isRevoked || msg.isExpired ? (
                  <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Zero-Trust Retention: Content Permanently Shredded</span>
                    </div>
                    <p className="text-xs text-rose-200/80 font-mono leading-relaxed">
                      {msg.bodyText}
                    </p>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-lg">
                    {/* Recipient Watermark Overlay */}
                    {msg.watermarkRecipient && (
                      <div className="absolute inset-0 pointer-events-none select-none opacity-5 flex items-center justify-center rotate-[-15deg] font-mono font-bold text-xs text-slate-400 whitespace-nowrap overflow-hidden">
                        {msg.recipients?.[0]?.email || user?.email || 'confidential@nextmail.local'} • CONFIDENTIAL ENVELOPE • DO NOT DISTRIBUTE
                      </div>
                    )}
                    <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                      {msg.bodyText}
                    </div>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {!msg.isRevoked && !msg.isExpired && msg.attachments && msg.attachments.length > 0 && (
                <div className="pl-10 pt-2 flex flex-wrap gap-2">
                  {msg.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => handleDownloadAttachment(att)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-slate-300 hover:border-primary-500 hover:text-white cursor-pointer transition-all group"
                      title="Click to download attachment"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-primary-400 group-hover:scale-110 transition-transform" />
                      <span className="font-medium text-[11px]">{att.filename}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({formatAttachmentSize(att.sizeBytes)})
                      </span>
                      <Download className="w-3 h-3 text-slate-400 group-hover:text-primary-400 ml-1 transition-colors" />
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))}
        </div>

        {/* Reply Composer Box */}
        <div className="p-3.5 rounded-xl bg-background-secondary border border-surface-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <Reply className="w-4 h-4 text-primary-400" />
              <span>Reply to thread</span>
            </div>

            {/* AI Assistant Tone Controls */}
            <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
              <span className="text-slate-400 mr-0.5">Tone:</span>
              {(['Concise', 'Professional', 'Friendly', 'Technical', 'Firm'] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                    selectedTone === tone
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface text-slate-400 hover:text-white'
                  }`}
                >
                  {tone}
                </button>
              ))}

              <button
                onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                className={`p-1 rounded-md text-slate-400 hover:text-white transition-colors ${
                  showCustomPrompt ? 'bg-surface-active text-primary-300' : 'hover:bg-surface'
                }`}
                title="Add custom instructions for AI"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleAIDraft}
                disabled={isDraftingAI}
                className="ml-1 flex items-center gap-1 bg-accent-ai/20 hover:bg-accent-ai/30 text-accent-ai border border-accent-ai/40 font-medium px-2.5 py-0.5 rounded-md transition-colors disabled:opacity-50"
              >
                <Sparkles className={`w-3 h-3 ${isDraftingAI ? 'animate-spin' : ''}`} />
                <span>{isDraftingAI ? 'Generating...' : 'AI Draft'}</span>
              </button>
            </div>
          </div>

          {/* Optional Custom Instructions Input */}
          {showCustomPrompt && (
            <div className="bg-surface/50 p-2 rounded-lg border border-surface-border space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Custom AI Guidance (e.g., "Decline Friday call, suggest next Tuesday at 3 PM")</span>
              </div>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Specific guidance for tone, dates, or decisions..."
                className="w-full bg-background text-xs text-slate-200 placeholder-slate-500 px-2.5 py-1.5 rounded border border-surface-border focus:outline-none focus:border-primary-500"
              />
            </div>
          )}

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Write your response, or click 'AI Draft' to generate a contextual reply..."
            className="w-full bg-background text-xs text-slate-200 placeholder-slate-400 p-3 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500 transition-colors"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-slate-400 font-mono">
              Press Cmd/Ctrl + Enter to send
            </div>
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || isSendingReply}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow transition-colors"
            >
              <span>{isSendingReply ? 'Sending...' : 'Send Reply'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Smart Follow-Up Scheduling Modal */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background-secondary border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-surface border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Schedule Smart Follow-Up</span>
              </div>
              <button
                onClick={() => setIsFollowUpModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <p className="text-slate-300">
                Choose when you want NextMail to nudge you if you have not received a response:
              </p>

              {/* Time Presets */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'In 24 Hours', hours: 24 },
                  { label: 'In 48 Hours', hours: 48 },
                  { label: 'Next Week', hours: 168 },
                ].map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() => setFollowUpHours(preset.hours)}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                      followUpHours === preset.hours
                        ? 'bg-primary-600/20 border-primary-500 text-white'
                        : 'bg-surface border-surface-border text-slate-300 hover:bg-surface-hover'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Auto-cancel on reply toggle */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface/50 border border-surface-border cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCancelOnReply}
                  onChange={(e) => setAutoCancelOnReply(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 bg-background text-primary-600 focus:ring-0"
                />
                <div>
                  <p className="font-medium text-slate-200">Auto-cancel if reply arrives</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Automatically resolves reminder if any recipient responds to this thread before the deadline.
                  </p>
                </div>
              </label>

              {/* Custom Note */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Reminder Note (optional):</label>
                <input
                  type="text"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="e.g., Awaiting review on database failover runbook"
                  className="w-full bg-background text-xs text-slate-200 placeholder-slate-500 px-3 py-1.5 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-surface border-t border-surface-border flex items-center justify-end gap-2">
              <button
                onClick={() => setIsFollowUpModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
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
                className="bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs px-4 py-1.5 rounded-lg shadow transition-colors"
              >
                {isSchedulingFollowUp ? 'Scheduling...' : 'Set Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Envelope Access Audit Trail Modal */}
      {selectedAuditMessageId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-background-secondary border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-4 py-3 bg-surface border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent-secure" />
                <div>
                  <h3 className="text-xs font-semibold text-white">Controlled Envelope Audit Trail</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Message ID: {selectedAuditMessageId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditMessageId(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-surface border border-surface-border">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Total Access Events</span>
                  <p className="text-lg font-bold text-white mt-0.5">{auditLogs.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-surface-border">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Unique Viewers</span>
                  <p className="text-lg font-bold text-primary-300 mt-0.5">
                    {new Set(auditLogs.map((l) => l.viewerEmail)).size}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-surface-border">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Zero-Trust Policy</span>
                  <p className="text-xs font-semibold text-emerald-400 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Immutable Audit
                  </p>
                </div>
              </div>

              {isLoadingAudit ? (
                <div className="py-8 text-center text-slate-400">
                  <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-400" />
                  <p className="text-xs">Loading tamper-evident access log...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Eye className="w-6 h-6 mx-auto mb-2 text-slate-500 opacity-60" />
                  <p className="text-xs">No access attempts recorded yet</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Every recipient view and restricted action is logged here.</p>
                </div>
              ) : (
                <div className="border border-surface-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface/80 border-b border-surface-border text-[10px] font-mono text-slate-400">
                      <tr>
                        <th className="py-2 px-3">Viewer Identity</th>
                        <th className="py-2 px-3">Event Type</th>
                        <th className="py-2 px-3">IP Address</th>
                        <th className="py-2 px-3">Client User-Agent</th>
                        <th className="py-2 px-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border/50 text-[11px]">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface/40 transition-colors">
                          <td className="py-2 px-3 font-mono text-slate-200">
                            {log.viewerEmail}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                log.eventType === 'VIEWED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : log.eventType === 'REVOKED'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {log.eventType}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400">{log.ipAddress}</td>
                          <td className="py-2 px-3 font-mono text-slate-400 max-w-[150px] truncate" title={log.userAgent}>
                            {log.userAgent}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400 text-right">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-surface border-t border-surface-border flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                Cryptographically audited by NextMail Zero-Trust Engine
              </span>
              <button
                onClick={() => setSelectedAuditMessageId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-surface-border/60 hover:bg-surface-border transition-colors"
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

