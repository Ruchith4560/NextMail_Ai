import React, { useState } from 'react';
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
  Send
} from 'lucide-react';
import { useMailStore } from '../../store/mailStore';

export const ThreadView: React.FC = () => {
  const { threads, selectedThreadId, toggleStar } = useMailStore();
  const [replyText, setReplyText] = useState('');
  const [selectedTone, setSelectedTone] = useState<'Concise' | 'Professional' | 'Friendly' | 'Firm'>('Professional');
  const [isDraftingAI, setIsDraftingAI] = useState(false);

  const thread = threads.find((t) => t.id === selectedThreadId);

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

  const handleAIDraft = () => {
    setIsDraftingAI(true);
    setTimeout(() => {
      if (selectedTone === 'Concise') {
        setReplyText(`Sarah,\n\nReviewed the failover runbook v2.4 (pages 8-14). Virtual thread pool limits are tuned to 50 concurrent DB connections max during cutover. Standby replica sign-off granted.\n\nBest,\nAlex`);
      } else if (selectedTone === 'Professional') {
        setReplyText(`Hi Sarah,\n\nThank you for provisioning the standby replica in us-east-2. I have thoroughly reviewed the database failover procedures detailed in runbook v2.4.\n\nFrom an architectural standpoint, the semi-synchronous Patroni configuration and reduced DNS TTL will adequately protect us against failover split-brain. You have my formal sign-off for Thursday's window.\n\nBest regards,\nAlex Rivera`);
      } else if (selectedTone === 'Firm') {
        setReplyText(`Sarah,\n\nSign-off is approved on the condition that we execute a dry-run test in staging at least 24 hours prior to the Thursday window. Ensure failover logs are piped directly to CloudWatch.\n\nAlex`);
      } else {
        setReplyText(`Hey Sarah,\n\nGreat work getting the us-east-2 standby ready so fast! The runbook looks solid—happy to give my sign-off for Thursday's migration. Let me know if you need any extra pair-testing before then!\n\nCheers,\nAlex`);
      }
      setIsDraftingAI(false);
    }, 600);
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

        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md hover:bg-surface-hover text-slate-400 hover:text-white transition-colors" title="Archive (E)">
            <Archive className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-surface-hover text-slate-400 hover:text-rose-400 transition-colors" title="Trash (#)">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* AI Executive Briefing / Summary Banner */}
        {thread.aiSummary && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-accent-ai/10 via-surface to-surface border border-accent-ai/30 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-ai animate-pulse" />
                <span className="text-xs font-semibold text-accent-ai uppercase tracking-wider font-mono">
                  NextMail AI Executive Briefing
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Model: Gemini 1.5 Pro</span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed mb-3">
              {thread.aiSummary.overview}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Decisions */}
              <div className="p-2 rounded-lg bg-background/60 border border-surface-border">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Decisions Made</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                  {thread.aiSummary.decisions.map((d, i) => (
                    <li key={i} className="leading-snug">{d}</li>
                  ))}
                </ul>
              </div>

              {/* Action Items & Deadlines */}
              <div className="p-2 rounded-lg bg-background/60 border border-surface-border">
                <div className="flex items-center gap-1.5 text-amber-400 font-medium mb-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Action Items & Commitments</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                  {thread.aiSummary.actionItems.map((a, i) => (
                    <li key={i} className="leading-snug">{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

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
                    <span className="flex items-center gap-1 text-[10px] text-accent-secure bg-accent-secure/10 px-1.5 py-0.5 rounded border border-accent-secure/20">
                      <Lock className="w-3 h-3" />
                      <span>Controlled Envelope</span>
                    </span>
                  )}
                  <span>{msg.sentAt}</span>
                </div>
              </div>

              {/* Message Body */}
              <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans pl-10">
                {msg.bodyText}
              </div>

              {/* Attachments */}
              {msg.attachments.length > 0 && (
                <div className="pl-10 pt-2 flex flex-wrap gap-2">
                  {msg.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-surface-border text-xs text-slate-300 hover:border-primary-500/50 cursor-pointer transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-primary-400" />
                      <span className="font-medium text-[11px]">{att.filename}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({(att.sizeBytes / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Reply Composer Box */}
        <div className="p-3.5 rounded-xl bg-background-secondary border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <Reply className="w-4 h-4 text-primary-400" />
              <span>Reply to thread</span>
            </div>

            {/* AI Assistant Tone Controls */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Tone:</span>
              {(['Concise', 'Professional', 'Friendly', 'Firm'] as const).map((tone) => (
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
                onClick={handleAIDraft}
                disabled={isDraftingAI}
                className="ml-2 flex items-center gap-1 bg-accent-ai/20 hover:bg-accent-ai/30 text-accent-ai border border-accent-ai/40 font-medium px-2.5 py-0.5 rounded-md transition-colors"
              >
                <Sparkles className={`w-3 h-3 ${isDraftingAI ? 'animate-spin' : ''}`} />
                <span>{isDraftingAI ? 'Generating...' : 'AI Draft'}</span>
              </button>
            </div>
          </div>

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
              disabled={!replyText.trim()}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow transition-colors"
            >
              <span>Send Reply</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
