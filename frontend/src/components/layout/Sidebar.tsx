import React from 'react';
import { 
  Inbox, 
  Send, 
  FileText, 
  Folder, 
  Trash2, 
  Plus, 
  User, 
  ArrowRight,
  Mail,
  PenSquare
} from 'lucide-react';
import { useMailStore } from '../../store/mailStore';
import { useAuthStore } from '../../store/authStore';
import { MailboxFolder } from '../../types/mail';

interface NavItem {
  id: MailboxFolder;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
];

const LABELS = [
  { id: 'art-acquisition', label: 'Art Acquisition', icon: Folder },
  { id: 'investment-portfolio', label: 'Investment Portfolio', icon: Folder },
  { id: 'low-stats', label: 'Low Stats', icon: Folder },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export const Sidebar: React.FC = () => {
  const { currentFolder, setCurrentFolder, setComposeOpen } = useMailStore();
  const { user, isAuthenticated, setAuthModalOpen } = useAuthStore();

  return (
    <aside className="w-56 bg-[#EFE8DC] border-r border-[#DFD5C4] flex flex-col justify-between p-4 select-none flex-shrink-0">
      <div className="space-y-5">
        {/* Brand Header: Eos Mail */}
        <div className="flex items-center gap-2 px-1">
          <Mail className="w-5 h-5 text-[#A85338]" strokeWidth={1.75} />
          <h1 className="font-serif text-lg font-semibold tracking-tight text-[#2C241E]">
            Eos Mail
          </h1>
        </div>

        {/* Compose New Message Pill */}
        <button
          onClick={() => setComposeOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-[#FAF7F0] hover:bg-[#F3ECE0] text-[#2C241E] border border-[#DFD5C4] font-medium text-xs py-2 px-3 rounded-lg shadow-2xs transition-all duration-150 cursor-pointer"
        >
          <PenSquare className="w-3.5 h-3.5 text-[#A85338]" />
          <span>New Message</span>
        </button>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = currentFolder === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentFolder(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#E5DCCF] text-[#A85338] shadow-2xs font-semibold'
                    : 'text-[#5C5044] hover:bg-[#EAE1D3] hover:text-[#2C241E]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#A85338]' : 'text-[#7D6F61]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Labels Section */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between px-3 text-[11px] font-medium text-[#7D6F61]">
            <span>Labels</span>
            <button 
              onClick={() => alert('New label created')} 
              className="text-[#7D6F61] hover:text-[#2C241E] cursor-pointer"
              title="Add Label"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {LABELS.map((item) => {
            const Icon = item.icon;
            const isActive = currentFolder === (item.id as MailboxFolder);
            return (
              <button
                key={item.id}
                onClick={() => setCurrentFolder(item.id as MailboxFolder)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#E5DCCF] text-[#A85338] font-semibold'
                    : 'text-[#5C5044] hover:bg-[#EAE1D3] hover:text-[#2C241E]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#7D6F61]" strokeWidth={1.75} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* User Status / Login Pill at Bottom */}
      <div className="pt-4">
        <button
          onClick={() => setAuthModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#D2DCD0] hover:bg-[#C7D3C5] text-[#364732] font-medium text-xs transition-colors cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-[#B9C6B6] flex items-center justify-center text-[#2A3826] font-bold text-[10px]">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">
              {isAuthenticated && user ? user.fullName || user.email.split('@')[0] : 'Login'}
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#4D6049]" />
        </button>
      </div>
    </aside>
  );
};
