import React, { useState, useRef } from 'react';
import { X, Send, Lock, Paperclip, Sparkles, Clock, Loader2, FileText } from 'lucide-react';
import { useMailStore } from '../../store/mailStore';

interface UploadedFile {
  id: string;
  filename: string;
  sizeBytes: number;
  detectedContentType: string;
}

export const ComposeModal: React.FC = () => {
  const { isComposeOpen, setComposeOpen, sendMessage, uploadAttachment } = useMailStore();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isControlled, setIsControlled] = useState(false);
  const [expiryHours, setExpiryHours] = useState('48');
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

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
      attachmentIds: attachments.map((a) => a.id),
    });
    setIsSending(false);
    if (success) {
      setTo('');
      setSubject('');
      setBody('');
      setAttachments([]);
      setIsControlled(false);
      setComposeOpen(false);
    }
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
            rows={7}
            placeholder="Write your email here..."
            className="w-full bg-background text-xs text-slate-200 placeholder-slate-400 p-3 rounded-lg border border-surface-border focus:outline-none focus:border-primary-500 font-sans"
          />

          {/* Uploaded Attachments Tray */}
          {(attachments.length > 0 || isUploading) && (
            <div className="p-2.5 rounded-lg bg-surface/40 border border-surface-border flex flex-wrap gap-2 items-center">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-surface-border text-xs text-slate-200 group"
                >
                  <FileText className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                  <span className="text-[11px] font-medium truncate max-w-[180px]" title={att.filename}>
                    {att.filename}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({formatFileSize(att.sizeBytes)})
                  </span>
                  <button
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="text-slate-400 hover:text-rose-400 ml-1 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {isUploading && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400" />
                  <span className="text-[11px]">Inspecting & encrypting payload...</span>
                </div>
              )}
            </div>
          )}

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

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-surface border-t border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 rounded-md hover:bg-surface-hover text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs"
              title="Attach files (Max 25 MB)"
            >
              <Paperclip className="w-4 h-4 text-primary-400" />
              <span className="hidden sm:inline text-[11px] text-slate-300 font-medium">Attach</span>
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
              disabled={isSending || isUploading}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium text-xs px-4 py-1.5 rounded-lg shadow transition-colors"
            >
              <span>{isSending ? 'Dispatching...' : 'Send Message'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
