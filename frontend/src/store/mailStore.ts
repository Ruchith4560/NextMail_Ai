import { create } from 'zustand';
import { MailboxFolder, EmailThread, EmailMessage } from '../types/mail';
import { apiClient } from '../services/apiClient';

interface ThreadApiResponse {
  id: string;
  subject: string;
  snippet: string;
  messageCount: number;
  hasAttachments: boolean;
  lastMessageAt: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isSpam: boolean;
  isTrash: boolean;
  priorityTier: 'URGENT' | 'IMPORTANT' | 'NORMAL' | 'LOW';
  priorityScore: number;
  priorityReason: string;
}

interface MessageApiResponse {
  id: string;
  threadId: string;
  messageIdHeader: string;
  inReplyTo?: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  sentAt: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isControlled: boolean;
  expiresAt?: string;
  hasAttachments: boolean;
  recipients: Array<{ type: string; email: string; name?: string }>;
}

interface ThreadDetailApiResponse extends ThreadApiResponse {
  messages: MessageApiResponse[];
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface SearchResultDTO {
  messageId: string;
  threadId: string;
  subject: string;
  snippet: string;
  highlightedSnippet: string;
  senderEmail: string;
  senderName: string;
  recipientEmails: string[];
  folder: string;
  labels: string[];
  hasAttachments: boolean;
  isStarred: boolean;
  isRead: boolean;
  isControlled: boolean;
  receivedAt: string;
  score: number;
}

interface SearchPageResponse {
  content: SearchResultDTO[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  executedByEngine: string;
}

interface MailState {
  currentFolder: MailboxFolder;
  selectedThreadId: string | null;
  threads: EmailThread[];
  searchQuery: string;
  searchResults: SearchResultDTO[];
  isSearching: boolean;
  searchEngine: string | null;
  searchTotal: number;
  isComposeOpen: boolean;
  isAIThinking: boolean;
  isLoadingThreads: boolean;

  setCurrentFolder: (folder: MailboxFolder) => void;
  setSelectedThreadId: (id: string | null) => void;
  setThreads: (threads: EmailThread[]) => void;
  setSearchQuery: (query: string) => void;
  searchEmails: (query: string, folder?: string) => Promise<void>;
  clearSearch: () => void;
  setComposeOpen: (isOpen: boolean) => void;
  
  fetchThreads: (folder?: MailboxFolder) => Promise<void>;
  fetchThreadDetail: (threadId: string) => Promise<void>;
  sendMessage: (payload: {
    to: string[];
    subject: string;
    bodyText: string;
    threadId?: string;
    isControlled?: boolean;
    expiryHours?: number;
  }) => Promise<boolean>;
  toggleStar: (threadId: string) => Promise<void>;
  markAsRead: (threadId: string) => Promise<void>;
  archiveThread: (threadId: string) => Promise<void>;
  trashThread: (threadId: string) => Promise<void>;
}

// Initial demonstration data for high-fidelity SaaS presentation
const INITIAL_DEMO_THREADS: EmailThread[] = [
  {
    id: 'thread-1',
    subject: 'Q4 Enterprise Infrastructure Migration & Zero-Downtime Strategy',
    snippet: 'Sarah Jenkins: The final architecture review for the AWS to hybrid-cloud migration is scheduled. Please review the attached failover runbook before Thursday...',
    messageCount: 4,
    hasAttachments: true,
    lastMessageAt: '10:42 AM',
    isRead: false,
    isStarred: true,
    priorityTier: 'URGENT',
    priorityScore: 0.94,
    priorityReason: 'Identified upcoming deadline (Thursday) and architectural sign-off requested from Engineering Leadership.',
    labels: ['Engineering', 'Architecture', 'Q4'],
    aiSummary: {
      overview: 'Thread focuses on approving the final zero-downtime database failover procedures for the upcoming Q4 infrastructure migration.',
      decisions: [
        'PostgreSQL replication will operate in semi-synchronous mode with Patroni.',
        'DNS TTL reduced from 3600s to 60s ahead of the cutover window.'
      ],
      actionItems: [
        'Review failover runbook v2.4 before Thursday 17:00 EST.',
        'Confirm standby replica provisioning in us-east-2.'
      ],
      unresolvedQuestions: [
        'Do we need secondary S3 bucket replication for compliance logs?'
      ],
      deadlines: ['Thursday, Oct 8 at 5:00 PM EST']
    },
    messages: [
      {
        id: 'msg-1-1',
        threadId: 'thread-1',
        sender: { name: 'Sarah Jenkins (Principal DevOps)', email: 'sarah.j@acme-systems.cloud' },
        recipients: [{ name: 'Alex Rivera (Staff Architect)', email: 'alex.r@nextmail.local' }],
        subject: 'Q4 Enterprise Infrastructure Migration & Zero-Downtime Strategy',
        snippet: 'The final architecture review for the AWS to hybrid-cloud migration is scheduled...',
        bodyText: `Alex,\n\nThe final architecture review for the AWS to hybrid-cloud migration is scheduled for Thursday. We've updated the runbook based on last week's chaos engineering results.\n\nPlease review the database failover section (pages 8-14) and verify that our virtual thread connection pooling won't overwhelm the PostgreSQL standby during failover.\n\nBest,\nSarah`,
        sentAt: 'Yesterday, 4:15 PM',
        receivedAt: 'Yesterday, 4:15 PM',
        isRead: true,
        isStarred: true,
        attachments: [
          { id: 'att-1', filename: 'failover_runbook_v2.4.pdf', contentType: 'application/pdf', sizeBytes: 2450000 }
        ],
        securityFlags: {
          isPhishingRisk: false,
          spfValid: true,
          dkimValid: true,
          suspiciousLinksCount: 0
        }
      },
      {
        id: 'msg-1-2',
        threadId: 'thread-1',
        sender: { name: 'Sarah Jenkins (Principal DevOps)', email: 'sarah.j@acme-systems.cloud' },
        recipients: [{ name: 'Alex Rivera (Staff Architect)', email: 'alex.r@nextmail.local' }],
        subject: 'Re: Q4 Enterprise Infrastructure Migration & Zero-Downtime Strategy',
        snippet: 'Quick update: Standby replica provisioned in us-east-2. Need your sign-off by Thursday 5pm.',
        bodyText: `Quick update:\n\nThe standby replica is now provisioned in us-east-2. We need your sign-off before Thursday 5:00 PM EST so the change management board can authorize the window.\n\nLet me know if you need any adjustments to the metrics dashboards.`,
        sentAt: '10:42 AM',
        receivedAt: '10:42 AM',
        isRead: false,
        isStarred: true,
        attachments: [],
        securityFlags: {
          isPhishingRisk: false,
          spfValid: true,
          dkimValid: true,
          suspiciousLinksCount: 0
        }
      }
    ]
  },
  {
    id: 'thread-2',
    subject: 'Security Alert: Suspicious login attempt flagged via SSO Gateway',
    snippet: 'NextMail SecOps: An anomalous login was detected from IP 185.220.101.5 (Tor Exit Node). Automated link quarantine engaged...',
    messageCount: 1,
    hasAttachments: false,
    lastMessageAt: '09:15 AM',
    isRead: false,
    isStarred: false,
    priorityTier: 'IMPORTANT',
    priorityScore: 0.88,
    priorityReason: 'SecOps automated alert with detected threat indicator.',
    labels: ['Security', 'Alert'],
    messages: [
      {
        id: 'msg-2-1',
        threadId: 'thread-2',
        sender: { name: 'SecOps Security Daemon', email: 'security-alerts@nextmail.local' },
        recipients: [{ name: 'Alex Rivera', email: 'alex.r@nextmail.local' }],
        subject: 'Security Alert: Suspicious login attempt flagged via SSO Gateway',
        snippet: 'An anomalous login was detected from IP 185.220.101.5...',
        bodyText: `Attention:\n\nOur real-time anomaly detection caught a failed login challenge from a known proxy/Tor exit node targeting your administrative alias.\n\nAction Taken: Two-Factor challenge was enforced and session creation was blocked. No credentials were breached.\n\nIf this was not you, please audit your active sessions in Settings > Security.`,
        sentAt: '09:15 AM',
        receivedAt: '09:15 AM',
        isRead: false,
        isStarred: false,
        attachments: [],
        securityFlags: {
          isPhishingRisk: false,
          spfValid: true,
          dkimValid: true,
          suspiciousLinksCount: 0
        }
      }
    ]
  },
  {
    id: 'thread-3',
    subject: '[Controlled Message] Confidential: Series B Term Sheet & Governance Draft',
    snippet: 'David Zhang (Venture Partner): Access granted under NextMail Controlled Envelope. This message is configured to expire in 48 hours...',
    messageCount: 1,
    hasAttachments: true,
    lastMessageAt: 'Yesterday',
    isRead: true,
    isStarred: true,
    priorityTier: 'IMPORTANT',
    priorityScore: 0.82,
    priorityReason: 'Confidential corporate governance document with 48h expiration timer.',
    labels: ['Confidential', 'Finance'],
    messages: [
      {
        id: 'msg-3-1',
        threadId: 'thread-3',
        sender: { name: 'David Zhang', email: 'david.zhang@apex-ventures.io' },
        recipients: [{ name: 'Alex Rivera', email: 'alex.r@nextmail.local' }],
        subject: '[Controlled Message] Confidential: Series B Term Sheet & Governance Draft',
        snippet: 'This message is protected by NextMail Envelope Encryption...',
        bodyText: `Alex,\n\nHere is the revised draft of the Series B term sheet with the updated valuation cap and board seat allocations.\n\n[Controlled Envelope Note]:\nThis document is protected with NextMail cryptographic envelope policies. Forwarding is disabled, download is restricted to verified hardware, and the link automatically revokes on Sunday at 23:59 UTC.`,
        sentAt: 'Yesterday, 2:30 PM',
        receivedAt: 'Yesterday, 2:30 PM',
        isRead: true,
        isStarred: true,
        isControlled: true,
        expiresAt: '2026-10-05T23:59:00Z',
        attachments: [
          { id: 'att-2', filename: 'Series_B_Term_Sheet_Confidential.pdf', contentType: 'application/pdf', sizeBytes: 890000 }
        ],
        securityFlags: {
          isPhishingRisk: false,
          spfValid: true,
          dkimValid: true,
          suspiciousLinksCount: 0
        }
      }
    ]
  }
];

export const useMailStore = create<MailState>((set, get) => ({
  currentFolder: 'inbox',
  selectedThreadId: 'thread-1',
  threads: INITIAL_DEMO_THREADS,
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  searchEngine: null,
  searchTotal: 0,
  isComposeOpen: false,
  isAIThinking: false,
  isLoadingThreads: false,

  setCurrentFolder: (folder) => {
    set({ currentFolder: folder, selectedThreadId: null });
    get().fetchThreads(folder);
  },
  setSelectedThreadId: (id) => {
    set({ selectedThreadId: id });
    if (id && !id.startsWith('thread-')) {
      get().fetchThreadDetail(id);
    }
  },
  setThreads: (threads) => set({ threads }),
  setSearchQuery: (query) => {
    set({ searchQuery: query });
    if (!query || query.trim() === '') {
      get().clearSearch();
    } else {
      get().searchEmails(query);
    }
  },

  searchEmails: async (query, folder) => {
    if (!query || query.trim() === '') {
      set({ searchResults: [], isSearching: false, searchEngine: null, searchTotal: 0 });
      return;
    }

    set({ isSearching: true });
    const token = localStorage.getItem('nextmail_token');
    if (token) {
      try {
        const params: Record<string, string> = { q: query.trim() };
        if (folder) params.folder = folder;

        const res = await apiClient.get<SearchPageResponse>('/search', params);
        if (res.data?.content) {
          set({
            searchResults: res.data.content,
            searchEngine: res.data.executedByEngine,
            searchTotal: res.data.totalElements,
            isSearching: false,
          });
          return;
        }
      } catch (err) {
        console.warn('Backend search API failed, falling back to local thread filtering', err);
      }
    }

    // Client fallback search for demo mode
    const q = query.toLowerCase();
    const filtered = get().threads.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.snippet.toLowerCase().includes(q)
    );
    const mockResults: SearchResultDTO[] = filtered.map((t) => ({
      messageId: t.id,
      threadId: t.id,
      subject: t.subject,
      snippet: t.snippet,
      highlightedSnippet: t.snippet.replace(
        new RegExp(`(${query})`, 'gi'),
        '<mark class="bg-amber-400/25 text-amber-200 px-0.5 rounded">$1</mark>'
      ),
      senderEmail: 'colleague@nextmail.local',
      senderName: 'NextMail Workspace',
      recipientEmails: ['me@nextmail.local'],
      folder: 'INBOX',
      labels: t.labels || [],
      hasAttachments: t.hasAttachments,
      isStarred: t.isStarred,
      isRead: t.isRead,
      isControlled: false,
      receivedAt: new Date().toISOString(),
      score: 1.0,
    }));

    set({
      searchResults: mockResults,
      searchEngine: 'CLIENT_FALLBACK',
      searchTotal: mockResults.length,
      isSearching: false,
    });
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: [], isSearching: false, searchEngine: null, searchTotal: 0 });
  },

  setComposeOpen: (isComposeOpen) => set({ isComposeOpen }),

  fetchThreads: async (folder) => {
    const targetFolder = folder || get().currentFolder;
    const token = localStorage.getItem('nextmail_token');
    if (!token) return; // Unauthenticated users see demo fixture threads

    set({ isLoadingThreads: true });
    try {
      const res = await apiClient.get<PageResponse<ThreadApiResponse>>(
        `/mail/threads?folder=${targetFolder.toUpperCase()}`
      );
      if (res.data?.content && res.data.content.length > 0) {
        const liveThreads: EmailThread[] = res.data.content.map((t) => ({
          id: t.id,
          subject: t.subject,
          snippet: t.snippet,
          messageCount: t.messageCount,
          hasAttachments: t.hasAttachments,
          lastMessageAt: new Date(t.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: t.isRead,
          isStarred: t.isStarred,
          priorityTier: t.priorityTier,
          priorityScore: t.priorityScore,
          priorityReason: t.priorityReason,
          labels: ['Inbox'],
        }));
        set({ threads: liveThreads, selectedThreadId: liveThreads[0]?.id || null });
      }
    } catch {
      // Fallback to memory threads on network or empty response
    } finally {
      set({ isLoadingThreads: false });
    }
  },

  fetchThreadDetail: async (threadId) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token || threadId.startsWith('thread-')) return;

    try {
      const res = await apiClient.get<ThreadDetailApiResponse>(`/mail/threads/${threadId}`);
      if (res.data) {
        const d = res.data;
        const messages: EmailMessage[] = (d.messages || []).map((m) => ({
          id: m.id,
          threadId: m.threadId,
          sender: { name: m.senderName, email: m.senderEmail },
          recipients: m.recipients.map((r) => ({ name: r.name, email: r.email })),
          subject: m.subject,
          snippet: m.bodyText.substring(0, 100),
          bodyText: m.bodyText,
          bodyHtml: m.bodyHtml,
          sentAt: new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          receivedAt: new Date(m.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: m.isRead,
          isStarred: m.isStarred,
          isControlled: m.isControlled,
          expiresAt: m.expiresAt,
          attachments: [],
          securityFlags: {
            isPhishingRisk: false,
            spfValid: true,
            dkimValid: true,
            suspiciousLinksCount: 0,
          },
        }));

        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === threadId ? { ...t, messages } : t
          ),
        }));
      }
    } catch {
      // Ignore
    }
  },

  sendMessage: async (payload) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) {
      alert('Please sign in to send live messages');
      return false;
    }

    try {
      await apiClient.post('/mail/send', {
        to: payload.to,
        subject: payload.subject,
        bodyText: payload.bodyText,
        threadId: payload.threadId && !payload.threadId.startsWith('thread-') ? payload.threadId : undefined,
        isControlled: payload.isControlled || false,
        expiryHours: payload.expiryHours || 48,
      });

      // Refresh threads from backend
      await get().fetchThreads();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      alert(msg);
      return false;
    }
  },

  toggleStar: async (threadId) => {
    // Optimistic UI update
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === threadId ? { ...t, isStarred: !t.isStarred } : t
      ),
    }));

    const token = localStorage.getItem('nextmail_token');
    if (token && !threadId.startsWith('thread-')) {
      try {
        await apiClient.patch(`/mail/threads/${threadId}/star`);
      } catch {
        // Rollback
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === threadId ? { ...t, isStarred: !t.isStarred } : t
          ),
        }));
      }
    }
  },

  markAsRead: async (threadId) => {
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === threadId ? { ...t, isRead: true } : t
      ),
    }));

    const token = localStorage.getItem('nextmail_token');
    if (token && !threadId.startsWith('thread-')) {
      try {
        await apiClient.patch(`/mail/threads/${threadId}/read?isRead=true`);
      } catch {
        // Rollback
      }
    }
  },

  archiveThread: async (threadId) => {
    set((state) => ({
      threads: state.threads.filter((t) => t.id !== threadId),
      selectedThreadId: state.selectedThreadId === threadId ? null : state.selectedThreadId,
    }));

    const token = localStorage.getItem('nextmail_token');
    if (token && !threadId.startsWith('thread-')) {
      try {
        await apiClient.patch(`/mail/threads/${threadId}/archive`);
      } catch {
        // Refresh
        get().fetchThreads();
      }
    }
  },

  trashThread: async (threadId) => {
    set((state) => ({
      threads: state.threads.filter((t) => t.id !== threadId),
      selectedThreadId: state.selectedThreadId === threadId ? null : state.selectedThreadId,
    }));

    const token = localStorage.getItem('nextmail_token');
    if (token && !threadId.startsWith('thread-')) {
      try {
        await apiClient.delete(`/mail/threads/${threadId}`);
      } catch {
        get().fetchThreads();
      }
    }
  },
}));
