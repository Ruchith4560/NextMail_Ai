import React, { useState, useRef } from 'react';
import { X, Send, Lock, Paperclip, Sparkles, Flame, Star } from 'lucide-react';
import { useMailStore } from '../../store/mailStore';
import { PriorityTier } from '../../types/mail';

interface UploadedFile {
  id: string;
  filename: string;
  sizeBytes: number;
  detectedContentType: string;
}

export const ComposeModal: React.FC = () => {
  const { isComposeOpen, setComposeOpen, sendMessage, uploadAttachment } = useMailStore();
  const [to, setTo] = useState('alex.chen@enterprise.io');
  const [subject, setSubject] = useState('Project Rollout & Security Milestone Review');
  const [priorityTier, setPriorityTier] = useState<PriorityTier>(PriorityTier.IMPORTANT);
  const [body, setBody] = useState(
`Hi Alex,

Following up on our sprint review, please find below the updated milestones and deployment checklist. 

Key Action Items:
1. Complete staging verification before 5:00 PM today.
2. Sign the security compliance addendum.
3. Confirm final rollback plan with devops.

Let me know if you need any clarification.

Best regards,
NextMail Operations Team`
  );
  const [isControlled, setIsControlled] = useState(false);
  const [expiryHours] = useState('48');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isComposeOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadAttachment(file);
      if (result) {
        setAttachments((prev) => [
          ...prev,
          {
            id: result.id,
            filename: result.filename,
            sizeBytes: result.sizeBytes,
            detectedContentType: result.detectedContentType,
          },
        ]);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      alert('Please fill in recipient, subject, and message body.');
      return;
    }
    setIsSending(true);
    const success = await sendMessage({
      to: [to.trim()],
      subject: subject.trim(),
      bodyText: body.trim(),
      isControlled,
      expiryHours: parseInt(expiryHours, 10),
      allowForwarding: true,
      allowPrinting: true,
      watermarkRecipient: false,
      attachmentIds: attachments.map((a) => a.id),
    });
    setIsSending(false);
    if (success) {
      setComposeOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-[#EAECF0] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-[#0E1318] border-b border-[#232B32] flex items-center justify-between text-white select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#00D084]/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[#00D084]" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              New Smart Message — NextMail AI
            </h2>
            {isControlled && (
              <span className="flex items-center gap-1 text-[10px] text-[#00D084] bg-emerald-950/60 px-2 py-0.5 rounded-full font-mono border border-emerald-800">
                <Lock className="w-2.5 h-2.5" />
                <span>Zero-Trust E2EE</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[#94A3B8]">
            <button
              onClick={() => setComposeOpen(false)}
              className="hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Priority Selector & Inputs */}
        <div className="p-5 space-y-4 bg-white">
          {/* Priority Pill Selector */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-[#EAECF0]">
            <span className="text-[#64748B] font-medium">Priority Level:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPriorityTier(PriorityTier.URGENT)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  priorityTier === PriorityTier.URGENT
                    ? 'bg-rose-50 text-rose-700 border border-rose-300 ring-2 ring-rose-100'
                    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
                <span>Urgent</span>
              </button>

              <button
                type="button"
                onClick={() => setPriorityTier(PriorityTier.IMPORTANT)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  priorityTier === PriorityTier.IMPORTANT
                    ? 'bg-amber-50 text-amber-700 border border-amber-300 ring-2 ring-amber-100'
                    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>Important</span>
              </button>

              <button
                type="button"
                onClick={() => setPriorityTier(PriorityTier.NORMAL)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  priorityTier === PriorityTier.NORMAL
                    ? 'bg-slate-100 text-slate-800 border border-slate-300 ring-2 ring-slate-100'
                    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                <span>Normal</span>
              </button>
            </div>
          </div>

          {/* To field */}
          <div className="flex items-center border-b border-[#EAECF0] pb-2 text-xs">
            <span className="text-[#64748B] font-semibold w-12">To:</span>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@company.com"
              className="flex-1 bg-transparent text-xs text-[#0F172A] focus:outline-none font-medium"
            />
          </div>

          {/* Subject Line */}
          <div className="flex items-center border-b border-[#EAECF0] pb-2 text-xs">
            <span className="text-[#64748B] font-semibold w-12">Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject..."
              className="flex-1 bg-transparent text-xs font-semibold text-[#0F172A] focus:outline-none"
            />
          </div>

          {/* Message Body */}
          <div>
            <textarea
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email content..."
              className="w-full bg-[#F8FAFC] p-4 rounded-xl border border-[#EAECF0] text-xs text-[#0F172A] leading-relaxed resize-none focus:outline-none focus:border-[#00D084] focus:bg-white transition-all placeholder-[#94A3B8]"
            />
          </div>

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] text-[#334155]"
                >
                  <Paperclip className="w-3 h-3 text-[#00D084]" />
                  <span className="truncate max-w-[150px]">{att.filename}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#EAECF0] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 text-[#475569] hover:text-[#0F172A] cursor-pointer transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#00D084]" />
              <span>{isUploading ? 'Uploading...' : 'Attach File'}</span>
            </button>

            <button
              onClick={() => setIsControlled(!isControlled)}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
                isControlled ? 'text-emerald-700 font-bold' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isControlled ? 'Encrypted (E2EE)' : 'Standard'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setComposeOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#E2E8F0] transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || isUploading}
              className="flex items-center gap-2 bg-[#00D084] hover:bg-[#00BA76] text-black font-bold text-xs px-5 py-2 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isSending ? 'Sending...' : 'Send Message'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
