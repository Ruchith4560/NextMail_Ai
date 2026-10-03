import React, { useState } from 'react';
import { X, Send, Lock, Paperclip, Sparkles, Clock } from 'lucide-react';
import { useMailStore } from '../../store/mailStore';

export const ComposeModal: React.FC = () => {
  const { isComposeOpen, setComposeOpen } = useMailStore();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isControlled, setIsControlled] = useState(false);
  const [expiryHours, setExpiryHours] = useState('48');

  if (!isComposeOpen) return null;

  const handleSend = () => {
    alert(`Message dispatched to ${to || 'recipient'} (Controlled Envelope: ${isControlled ? 'Active' : 'Disabled'})`);
    setComposeOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-background-secondary border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 bg-surface border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">New Message</span>
            {isControlled && (
              <span className="flex items-center gap-1 text-[10px] text-accent-secure bg-accent-secure/10 border border-accent-secure/30 px-1.5 py-0.5 rounded font-mono">
                <Lock className="w-2.5 h-2.5" />
                <span>Controlled Envelope Active</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setComposeOpen(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="p-4 space-y-3">
          <div className="flex items-center border-b border-surface-border pb-2">
            <span className="text-xs text-slate-400 w-16">To:</span>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@domain.com"
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center border-b border-surface-border pb-2">
            <span className="text-xs text-slate-400 w-16">Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Project Migration Review"
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Write your email here..."
            className="w-full bg-background text-xs text-slate-200 placeholder-slate-400 p-3 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500"
          />

          {/* Controlled Message Configuration Banner */}
          <div className="p-2.5 rounded-lg bg-surface/50 border border-surface-border flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isControlled}
                onChange={(e) => setIsControlled(e.target.checked)}
                className="rounded border-slate-600 bg-background text-primary-600 focus:ring-0"
              />
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-accent-secure" />
                <span>NextMail Controlled Envelope</span>
              </span>
            </label>

            {isControlled && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Self-destruct:</span>
                <select
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(e.target.value)}
                  className="bg-background text-slate-200 border border-surface-border rounded px-1.5 py-0.5 text-[11px]"
                >
                  <option value="1">1 hour</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                  <option value="168">7 days</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-surface border-t border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-md hover:bg-surface-hover text-slate-400 hover:text-white transition-colors" title="Attach file">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-ai/10 text-accent-ai hover:bg-accent-ai/20 text-xs font-medium border border-accent-ai/20 transition-colors">
              <Sparkles className="w-3 h-3" />
              <span>AI Polish</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setComposeOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs px-4 py-1.5 rounded-lg shadow transition-colors"
            >
              <span>Send Message</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
