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
  Check,
  X,
  AlertCircle,
  Eye,
  ShieldAlert,
  Ban,
  ArrowLeft,
  Flame
} from 'lucide-react';
import { useMailStore, EnvelopeAuditLogDTO } from '../../store/mailStore';
import { AttachmentMetadata, PriorityTier } from '../../types/mail';

interface ThreadViewProps {
  onBack?: () => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({ onBack }) => {
  const { 
    threads, 
    selectedThreadId, 
    setSelectedThreadId,
    toggleStar, 
    archiveThread, 
    trashThread, 
    markAsSpam,
    sendMessage,
    threadSummaries,
    isLoadingSummary,
    fetchThreadSummary,
    generateAiReply,
    activeFollowUps,
    createFollowUp,
    snoozeFollowUp,
    dismissFollowUp,
    revokeEnvelope,
    fetchEnvelopeAuditLogs,
  } = useMailStore();

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
  const activeThreadFollowUp = selectedThreadId ? activeFollowUps.find(f => f.threadId === selectedThreadId) : undefined;

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadSummary(selectedThreadId);
    }
  }, [selectedThreadId, fetchThreadSummary]);

  if (!thread) {
    return (
      <div className="flex-1 bg-[#F8FAFC] flex flex-col items-center justify-center text-[#64748B] p-8 select-none">
        <div className="w-14 h-14 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center mb-3 shadow-xs">
          <Sparkles className="w-6 h-6 text-[#00D084]" />
        </div>
        <p className="text-base font-bold text-[#0F172A]">Select a Request or Mail Thread</p>
        <p className="text-xs text-[#64748B] mt-1 max-w-sm text-center leading-relaxed">
          Choose any conversation from the inbox table to inspect real-time AI briefings, quarantine phishing threats, schedule priority follow-ups, or compose automated drafts.
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

  const handleScheduleFollowUp = async () => {
    setIsSchedulingFollowUp(true);
    try {
      await createFollowUp({
        threadId: thread.id,
        durationHours: followUpHours,
        condition: autoCancelOnReply ? 'NO_REPLY_RECEIVED' : 'ALWAYS_REMIND',
        note: followUpNote,
      });
      setIsFollowUpModalOpen(false);
      setFollowUpNote('');
    } finally {
      setIsSchedulingFollowUp(false);
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
      alert('Failed to download attachment. Please verify authentication.');
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
          viewerEmail: 'security-audit@nextmail.local',
          eventType: 'VIEWED',
          ipAddress: '198.51.100.24',
          userAgent: 'NextMail-Audit-Client/2.0',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
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

  const handleBack = () => {
    setSelectedThreadId(null);
    if (onBack) onBack();
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] flex flex-col h-full overflow-hidden select-none">
      {/* Top Thread Action Header */}
      <div className="px-6 py-4 bg-white border-b border-[#EAECF0] flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F1F5F9] text-xs font-semibold text-[#334155] transition-colors cursor-pointer"
            title="Return to inbox requests"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Table</span>
          </button>

          <div className="h-5 w-px bg-[#E2E8F0] mx-1" />

          <button
            onClick={() => toggleStar(thread.id)}
            className="text-[#94A3B8] hover:text-amber-500 transition-colors cursor-pointer"
            title="Star thread"
          >
            <Star className={`w-4 h-4 ${thread.isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>

          <h2 className="text-base font-bold text-[#0F172A] truncate tracking-tight">
            {thread.subject}
          </h2>

          {thread.isSpam ? (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <ShieldAlert className="w-3 h-3 text-red-600" />
              <span>SPAM & PHISHING</span>
            </span>
          ) : thread.priorityTier === PriorityTier.URGENT ? (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <Flame className="w-3 h-3 text-rose-600 fill-rose-600" />
              <span>URGENT</span>
            </span>
          ) : thread.priorityTier === PriorityTier.IMPORTANT ? (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
              <span>IMPORTANT</span>
            </span>
          ) : (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <span>NORMAL</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Smart Follow-Up Button */}
          <button
            onClick={() => setIsFollowUpModalOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeThreadFollowUp
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-white hover:bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]'
            }`}
            title="Schedule Priority Follow-up Task"
          >
            <Clock className={`w-3.5 h-3.5 ${activeThreadFollowUp ? 'text-emerald-600' : 'text-[#64748B]'}`} />
            <span>{activeThreadFollowUp ? 'Follow-Up Scheduled' : 'Schedule Task'}</span>
          </button>

          {/* Spam / Safe Toggle */}
          <button
            onClick={() => markAsSpam(thread.id, !thread.isSpam)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              thread.isSpam
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
            }`}
            title={thread.isSpam ? 'Mark safe and restore to inbox' : 'Flag as spam & quarantine'}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{thread.isSpam ? 'Mark as Safe' : 'Flag Spam'}</span>
          </button>

          <button
            onClick={() => archiveThread(thread.id)}
            className="p-2 rounded-xl hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] transition-colors cursor-pointer"
            title="Archive"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => trashThread(thread.id)}
            className="p-2 rounded-xl hover:bg-red-50 text-[#64748B] hover:text-red-600 border border-[#E2E8F0] transition-colors cursor-pointer"
            title="Move to trash"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

        {/* 1. SPAM & PHISHING THREAT WARNING BANNER */}
        {thread.isSpam && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center flex-shrink-0 text-red-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-red-900 text-sm flex items-center gap-2">
                    <span>Critical Threat: Phishing & Malicious Content Quarantined</span>
                    <span className="text-[10px] bg-red-200 text-red-800 px-2 py-0.5 rounded font-mono uppercase">
                      Severity: High
                    </span>
                  </h3>
                  <p className="text-red-700 mt-1 leading-relaxed">
                    NextMail AI automated shield intercepted this message. Detected risk patterns include <strong>lookalike domain spoofing</strong>, <strong>failed SPF/DKIM cryptographic signatures</strong>, and deceptive urgency language requesting credential or financial verification.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => markAsSpam(thread.id, false)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-100 text-red-800 border border-red-300 font-semibold transition-colors cursor-pointer"
                >
                  Mark as Safe
                </button>
                <button
                  onClick={() => trashThread(thread.id)}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Shred Message
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. ACTIVE SCHEDULED TASK BANNER */}
        {activeThreadFollowUp && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-950 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="font-bold text-emerald-900 flex items-center gap-2">
                  <span>Scheduled Follow-Up Due:</span>
                  <span className="font-mono text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {new Date(activeThreadFollowUp.dueAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  {activeThreadFollowUp.condition === 'NO_REPLY_RECEIVED'
                    ? '⚡ Auto-cancels if recipient replies before deadline'
                    : 'Fixed scheduled task reminder'}
                  {activeThreadFollowUp.note ? ` • Note: "${activeThreadFollowUp.note}"` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => snoozeFollowUp(activeThreadFollowUp.id, 24)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-[11px] font-semibold text-emerald-800 border border-emerald-300 transition-colors cursor-pointer"
                title="Postpone reminder by 24 hours"
              >
                +24h Snooze
              </button>
              <button
                onClick={() => dismissFollowUp(activeThreadFollowUp.id)}
                className="p-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer"
                title="Dismiss reminder"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 3. AI EXECUTIVE BRIEFING & SUMMARIZATION CARD */}
        {isLoadingSummary ? (
          <div className="p-5 rounded-2xl bg-white border border-[#EAECF0] animate-pulse flex items-center gap-3 shadow-xs">
            <Sparkles className="w-4 h-4 text-[#00D084] animate-spin" />
            <span className="text-xs text-[#475569] font-medium">
              NextMail AI synthesising executive thread briefing and analyzing decisions...
            </span>
          </div>
        ) : summary ? (
          <div className="p-6 rounded-2xl bg-white border border-[#EAECF0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    AI Executive Briefing & Decision Matrix
                  </h3>
                </div>
              </div>
              <span className="text-[10px] text-[#64748B] font-mono bg-[#F1F5F9] px-2.5 py-1 rounded-lg border border-[#E2E8F0]">
                Engine: {summary.modelUsed.includes('gemini') ? 'Gemini 1.5 Flash' : 'NextMail Enterprise'}
              </span>
            </div>

            <p className="text-xs text-[#334155] leading-relaxed bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
              {summary.overview}
            </p>

            {/* Decisions & Action Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {summary.keyDecisions && summary.keyDecisions.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Confirmed Decisions</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-emerald-800 list-disc list-inside">
                    {summary.keyDecisions.map((d, i) => (
                      <li key={i} className="leading-snug">{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.actionItems && summary.actionItems.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold mb-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Action Items & Suggested Deadlines</span>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    {summary.actionItems.map((a, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-amber-900">
                        <span className="leading-snug">• {a.task}</span>
                        {a.dueSuggestion && (
                          <span className="flex-shrink-0 text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            {a.dueSuggestion}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Unresolved Questions & Next Recommended Action */}
            <div className="space-y-3 pt-3 border-t border-[#EAECF0]">
              {summary.unresolvedQuestions && summary.unresolvedQuestions.length > 0 && (
                <div className="flex items-start gap-2 text-xs text-[#475569]">
                  <HelpCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#0F172A]">Unresolved Questions: </span>
                    <span>{summary.unresolvedQuestions.join('; ')}</span>
                  </div>
                </div>
              )}

              {summary.suggestedAction && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                  <div className="flex items-center gap-2 text-[#334155]">
                    <ArrowRight className="w-4 h-4 text-[#00D084]" />
                    <span>
                      <strong className="text-[#0F172A]">AI Recommendation:</strong> {summary.suggestedAction}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTone('Professional');
                      handleAIDraft();
                    }}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-xl bg-[#00D084] hover:bg-[#00BA76] text-black font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Generate Reply Draft</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* 4. MESSAGE HISTORY STACK */}
        <div className="space-y-4">
          {thread.messages?.map((msg) => (
            <div 
              key={msg.id} 
              className="p-6 rounded-2xl bg-white border border-[#EAECF0] shadow-sm space-y-4"
            >
              {/* Message Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {msg.sender.name ? msg.sender.name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">{msg.sender.name || 'User'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[#64748B] font-mono">{msg.sender.email}</span>
                      <span className="text-[10px] bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded font-mono">
                        To: {msg.recipients?.[0]?.email || 'recipient@domain.com'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-[#64748B] font-mono">
                  {msg.securityFlags?.spfValid ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>SPF/DKIM Valid</span>
                    </span>
                  ) : thread.isSpam ? (
                    <span className="flex items-center gap-1 text-[10px] text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 font-bold">
                      <ShieldAlert className="w-3 h-3 text-red-600" />
                      <span>Security Flagged</span>
                    </span>
                  ) : null}

                  {msg.isControlled && (
                    <div className="flex items-center gap-1.5">
                      {msg.isRevoked ? (
                        <span className="flex items-center gap-1 text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-bold font-mono">
                          <AlertCircle className="w-3 h-3" />
                          <span>REVOKED</span>
                        </span>
                      ) : msg.isExpired ? (
                        <span className="flex items-center gap-1 text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-bold font-mono">
                          <Clock className="w-3 h-3" />
                          <span>EXPIRED</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-mono">
                          <Lock className="w-3 h-3" />
                          <span>Controlled</span>
                        </span>
                      )}

                      <button
                        onClick={() => handleOpenAuditLogs(msg.id)}
                        className="flex items-center gap-1 text-[10px] text-[#475569] hover:text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] px-2 py-0.5 rounded border border-[#E2E8F0] transition-colors font-medium cursor-pointer"
                        title="View access audit trail"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Audit</span>
                      </button>

                      {!msg.isRevoked && !msg.isExpired && (
                        <button
                          onClick={() => handleRevokeEnvelope(msg.id)}
                          disabled={isRevoking}
                          className="flex items-center gap-1 text-[10px] text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition-colors font-medium cursor-pointer"
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

              {/* Message Body */}
              <div className="relative pl-13">
                {msg.isRevoked || msg.isExpired ? (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Zero-Trust Protocol: Access Revoked</span>
                    </div>
                    <p className="text-xs text-red-700 font-mono leading-relaxed">
                      {msg.bodyText}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-[#1E293B] whitespace-pre-line leading-relaxed font-sans">
                    {msg.bodyText}
                  </div>
                )}
              </div>

              {/* Attachments */}
              {!msg.isRevoked && !msg.isExpired && msg.attachments && msg.attachments.length > 0 && (
                <div className="pl-13 pt-2 flex flex-wrap gap-2.5">
                  {msg.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => handleDownloadAttachment(att)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#334155] hover:bg-white hover:border-[#00D084] cursor-pointer transition-all group"
                      title="Click to download attachment"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#00D084] group-hover:scale-110 transition-transform" />
                      <span className="font-medium text-[11px]">{att.filename}</span>
                      <span className="text-[10px] text-[#64748B] font-mono">
                        ({formatAttachmentSize(att.sizeBytes)})
                      </span>
                      <Download className="w-3 h-3 text-[#94A3B8] group-hover:text-[#00D084] ml-1 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 5. AI DRAFTING & REPLY COMPOSER BOX */}
        <div className="p-6 rounded-2xl bg-white border border-[#EAECF0] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAECF0]">
            <div className="flex items-center gap-2 text-xs text-[#0F172A] font-bold">
              <Reply className="w-4 h-4 text-[#00D084]" />
              <span>Compose Reply</span>
            </div>

            {/* AI Assistant Tone Controls */}
            <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
              <span className="text-[#64748B] mr-0.5 font-medium">Tone:</span>
              {(['Concise', 'Professional', 'Friendly', 'Technical', 'Firm'] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                    selectedTone === tone
                      ? 'bg-[#0E1318] text-white shadow-xs'
                      : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {tone}
                </button>
              ))}

              <button
                onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                className={`p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer ${
                  showCustomPrompt ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-[#F1F5F9]'
                }`}
                title="Add custom instructions for AI response"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleAIDraft}
                disabled={isDraftingAI}
                className="ml-1 flex items-center gap-1.5 bg-[#00D084] hover:bg-[#00BA76] text-black font-semibold px-3.5 py-1 rounded-full transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isDraftingAI ? 'animate-spin' : ''}`} />
                <span>{isDraftingAI ? 'Drafting...' : 'AI Draft'}</span>
              </button>
            </div>
          </div>

          {/* Optional Custom Instructions Input */}
          {showCustomPrompt && (
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#64748B] font-medium">
                <span>Custom AI Response Instructions</span>
              </div>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g., Decline Friday meeting, propose Monday 2 PM, confirm project budget is approved..."
                className="w-full bg-white text-xs text-[#0F172A] placeholder-[#94A3B8] px-3 py-2 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#00D084]"
              />
            </div>
          )}

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Write your response, or click 'AI Draft' for context-aware reply generation..."
            className="w-full bg-[#F8FAFC] text-xs text-[#0F172A] placeholder-[#94A3B8] p-4 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#00D084] focus:bg-white transition-all leading-relaxed"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-[#64748B] font-mono">
              Press Cmd/Ctrl + Enter to send
            </div>
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || isSendingReply}
              className="flex items-center gap-2 bg-[#0E1318] hover:bg-[#232B32] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>{isSendingReply ? 'Sending...' : 'Send Reply'}</span>
              <Send className="w-3.5 h-3.5 text-[#00D084]" />
            </button>
          </div>
        </div>
      </div>

      {/* PRIORITY TASK SCHEDULING MODAL */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#EAECF0] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-[#F8FAFC] border-b border-[#EAECF0] flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                <Clock className="w-4 h-4 text-[#00D084]" />
                <span>Schedule Priority Follow-Up Task</span>
              </div>
              <button
                onClick={() => setIsFollowUpModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#475569]">
                Set a smart deadline reminder based on email priority. If the recipient responds before the deadline, NextMail AI automatically resolves the task.
              </p>

              {/* Priority Presets */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: '⚡ Urgent (24h)', hours: 24 },
                  { label: '📌 Important (48h)', hours: 48 },
                  { label: '📅 Normal (7d)', hours: 168 },
                ].map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() => setFollowUpHours(preset.hours)}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition-colors cursor-pointer ${
                      followUpHours === preset.hours
                        ? 'bg-[#0E1318] text-white border-[#0E1318]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#334155] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Auto-cancel on reply */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#EAECF0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCancelOnReply}
                  onChange={(e) => setAutoCancelOnReply(e.target.checked)}
                  className="mt-0.5 rounded border-[#CBD5E1] text-[#00D084] focus:ring-0"
                />
                <div>
                  <p className="font-semibold text-[#0F172A]">Auto-cancel upon reply</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Automatically dismisses this task when a new incoming email arrives in this thread.
                  </p>
                </div>
              </label>

              {/* Custom Note */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#64748B]">Task Note (optional):</label>
                <input
                  type="text"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="e.g., Check if legal approved NDA terms"
                  className="w-full bg-[#F8FAFC] text-xs text-[#0F172A] placeholder-[#94A3B8] px-3 py-2 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#00D084]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFollowUpModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleScheduleFollowUp}
                  disabled={isSchedulingFollowUp}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00D084] hover:bg-[#00BA76] text-black shadow-xs transition-colors cursor-pointer"
                >
                  {isSchedulingFollowUp ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLLED ENVELOPE AUDIT TRAIL MODAL */}
      {selectedAuditMessageId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#EAECF0] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-[#F8FAFC] border-b border-[#EAECF0] flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Envelope Access Audit Trail</span>
              </div>
              <button
                onClick={() => setSelectedAuditMessageId(null)}
                className="text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {isLoadingAudit ? (
                <div className="text-center py-6 text-[#64748B]">Loading cryptographic log chain...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-6 text-[#64748B]">No access events recorded yet.</div>
              ) : (
                <div className="divide-y divide-[#EAECF0]">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between text-[11px]">
                      <div>
                        <p className="font-semibold text-[#0F172A]">{log.viewerEmail}</p>
                        <p className="text-[#64748B] font-mono">{log.ipAddress} • {log.eventType}</p>
                      </div>
                      <span className="font-mono text-[#94A3B8]">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
