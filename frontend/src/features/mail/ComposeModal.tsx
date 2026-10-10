import React, { useState, useRef } from 'react';
import { X, Send, Lock, Paperclip, Sparkles, Minus, Square } from 'lucide-react';
import { useMailStore } from '../../store/mailStore';

interface UploadedFile {
  id: string;
  filename: string;
  sizeBytes: number;
  detectedContentType: string;
}

export const ComposeModal: React.FC = () => {
  const { isComposeOpen, setComposeOpen, sendMessage, uploadAttachment } = useMailStore();
  const [to, setTo] = useState('alex.r@velisart.com');
  const [subject, setSubject] = useState('RE: Alcade Exclusive - Autumn Fine Art Collection');
  const [body, setBody] = useState(
`Dear Alex,

I have reviewed the preliminary catalog for the Autumn collection. The curation is exceptional, particularly the emphasis on emerging abstract expressionists.

I am interested in securing a private viewing. Please let me know your availability for a call.

Sincerely,
Alex.r Svantor
President Iniadal - Alcade Mall
Signature Block`
  );
  const [showArtworkPreview, setShowArtworkPreview] = useState(true);
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#FAF7F2] border border-[#DFD5C4] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar matching "New Message - Eos Mail" from image */}
        <div className="px-4 py-3 bg-[#283533] border-b border-[#1E2927] flex items-center justify-between text-[#FAF7F0] select-none">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-sm font-medium tracking-wide text-[#FAF7F0]">
              New Message - Eos Mail
            </h2>
            {isControlled && (
              <span className="flex items-center gap-1 text-[9px] text-[#A6C5A2] bg-[#3B4D49] px-1.5 py-0.5 rounded font-mono">
                <Lock className="w-2.5 h-2.5" />
                <span>E2EE</span>
              </span>
            )}
          </div>
          {/* Window control buttons */}
          <div className="flex items-center gap-3 text-[#A8B5B2]">
            <button className="hover:text-white transition-colors cursor-pointer" title="Minimize">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button className="hover:text-white transition-colors cursor-pointer" title="Maximize">
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={() => setComposeOpen(false)}
              className="hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="p-4 space-y-3 bg-[#FAF7F2]">
          {/* To field with avatar pill */}
          <div className="flex items-center border-b border-[#DFD5C4] pb-2 text-xs">
            <span className="text-[#7D6F61] font-medium w-10">To:</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 bg-[#EBE2D4] border border-[#D5C9B7] rounded-full px-2.5 py-0.5 text-xs text-[#2C241E]">
                <div className="w-4 h-4 rounded-full bg-[#A85338] text-white text-[9px] font-bold flex items-center justify-center">
                  A
                </div>
                <span>{to}</span>
              </div>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 bg-transparent text-xs text-[#2C241E] focus:outline-none"
              />
            </div>
          </div>

          {/* Subject Line */}
          <div className="border-b border-[#DFD5C4] pb-2 text-xs flex items-center">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject..."
              className="w-full bg-transparent text-xs font-medium text-[#2C241E] focus:outline-none"
            />
          </div>

          {/* Message Body */}
          <div className="space-y-3">
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="w-full bg-transparent text-xs text-[#2C241E] leading-relaxed resize-none focus:outline-none placeholder-[#A39485]"
            />

            {/* Embedded Artwork Card (like in screenshot) */}
            {showArtworkPreview && (
              <div className="border border-[#DFD5C4] rounded-xl p-3 bg-[#F4EFE6] relative group">
                <button
                  onClick={() => setShowArtworkPreview(false)}
                  className="absolute top-2 right-2 text-[#7D6F61] hover:text-[#2C241E] cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="w-48 h-28 rounded-lg overflow-hidden border border-[#D5C9B7] shadow-xs bg-gradient-to-tr from-[#1B365D] via-[#8B4513] to-[#D4AF37] relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'linear-gradient(45deg, #1A365D 25%, #A85338 50%, #C99700 75%)' }}></div>
                  <span className="relative z-10 text-[10px] text-white font-serif italic drop-shadow-md">Autumn Collection</span>
                </div>
                <p className="font-serif text-xs font-medium text-[#2C241E] mt-2">
                  Proposed Piece 3: "Luminous Tides"
                </p>
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
        <div className="px-4 py-3 bg-[#EFE8DC] border-t border-[#DFD5C4] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 text-[#5C5044] hover:text-[#2C241E] cursor-pointer transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#A85338]" />
              <span>Attach</span>
            </button>
            <button
              onClick={() => setIsControlled(!isControlled)}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
                isControlled ? 'text-[#3E5C38] font-semibold' : 'text-[#5C5044] hover:text-[#2C241E]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isControlled ? 'Encrypted' : 'Standard'}</span>
            </button>
            <button
              onClick={() => setShowArtworkPreview(!showArtworkPreview)}
              className="flex items-center gap-1.5 text-[#A85338] hover:text-[#8E3F27] cursor-pointer transition-colors font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showArtworkPreview ? 'Artwork Card Active' : 'Add Artwork Card'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setComposeOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#7D6F61] hover:text-[#2C241E] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || isUploading}
              className="flex items-center gap-1.5 bg-[#A85338] hover:bg-[#8E3F27] text-white font-medium text-xs px-4 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{isSending ? 'Sending...' : 'Send'}</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
