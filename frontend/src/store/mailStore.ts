import { create } from 'zustand';
import { EmailThread, MailboxFolder } from '../types/mail';
import { apiClient } from '../services/apiClient';
import { webSocketService } from '../services/webSocketService';

export interface ThreadApiResponse {
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
  labels?: string[];
}

export interface AttachmentApiResponse {
  id: string;
  messageId?: string;
  filename: string;
  declaredContentType?: string;
  detectedContentType: string;
  sizeBytes: number;
  sha256: string;
  storageEngine: string;
  scanStatus: string;
  isInline: boolean;
  createdAt: string;
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
  isExpired?: boolean;
  isRevoked?: boolean;
  allowForwarding?: boolean;
  allowPrinting?: boolean;
  watermarkRecipient?: boolean;
  hasAttachments: boolean;
  recipients: Array<{ type: string; email: string; name?: string }>;
  attachments?: AttachmentApiResponse[];
}

export interface ControlledEnvelopeDTO {
  id: string;
  messageId: string;
  senderId: string;
  senderEmail: string;
  expiresAt: string;
  isRevoked: boolean;
  revokedAt?: string;
  revokeReason?: string;
  allowForwarding: boolean;
  allowPrinting: boolean;
  watermarkRecipient: boolean;
  isExpired: boolean;
  isAccessible: boolean;
  viewCount: number;
  createdAt: string;
}

export interface EnvelopeAuditLogDTO {
  id: string;
  messageId: string;
  viewerId?: string;
  viewerEmail: string;
  eventType: 'VIEWED' | 'REVOKED' | 'EXPIRED_ACCESS_ATTEMPT' | 'PRINT_ATTEMPT_BLOCKED' | 'FORWARD_ATTEMPT_BLOCKED';
  ipAddress: string;
  userAgent: string;
  createdAt: string;
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

export interface AiActionItem {
  task: string;
  assignee: string;
  dueSuggestion: string;
}

export interface AiSummaryResponse {
  threadId: string;
  overview: string;
  keyDecisions: string[];
  actionItems: AiActionItem[];
  unresolvedQuestions: string[];
  priorityTier: 'URGENT' | 'IMPORTANT' | 'NORMAL' | 'LOW';
  priorityScore: number;
  priorityReason: string;
  suggestedAction: string;
  modelUsed: string;
  generatedAt: string;
}

export interface AiReplyResponse {
  suggestedReplyText: string;
  tone: string;
  modelUsed: string;
}

export type FollowUpStatus = 'PENDING' | 'TRIGGERED' | 'AUTO_RESOLVED' | 'SNOOZED' | 'DISMISSED';
export type FollowUpCondition = 'NO_REPLY_RECEIVED' | 'ALWAYS_REMIND' | 'INBOX_ZERO_NUDGE';

export interface FollowUpReminderDTO {
  id: string;
  userId: string;
  threadId: string;
  threadSubject?: string;
  messageId?: string;
  dueAt: string;
  condition: FollowUpCondition;
  status: FollowUpStatus;
  note?: string;
  originalLastMessageAt?: string;
  triggeredAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

export type NotificationType =
  | 'NEW_EMAIL'
  | 'FOLLOW_UP_DUE'
  | 'AI_SUMMARY_READY'
  | 'SECURITY_ALERT'
  | 'THREAD_PRIORITY_ESCALATED';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  threadId?: string;
  messageId?: string;
  isRead: boolean;
  createdAt: string;
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
  threadSummaries: Record<string, AiSummaryResponse>;
  isLoadingSummary: boolean;
  activeFollowUps: FollowUpReminderDTO[];
  activeThreadFollowUp: FollowUpReminderDTO | null;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  isNotificationsOpen: boolean;

  setIsNotificationsOpen: (open: boolean) => void;
  fetchNotifications: () => Promise<void>;
  fetchUnreadNotificationsCount: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  initializeWebSocket: (userId: string, token: string) => () => void;

  setCurrentFolder: (folder: MailboxFolder) => void;
  setSelectedThreadId: (id: string | null) => void;
  setThreads: (threads: EmailThread[]) => void;
  setSearchQuery: (query: string) => void;
  searchEmails: (query: string, folder?: string) => Promise<void>;
  clearSearch: () => void;
  setComposeOpen: (isOpen: boolean) => void;
  fetchThreadSummary: (threadId: string) => Promise<AiSummaryResponse | null>;
  generateAiReply: (threadId: string, tone: string, instructions?: string) => Promise<string | null>;
  
  fetchThreads: (folder?: MailboxFolder) => Promise<void>;
  fetchThreadDetail: (threadId: string) => Promise<void>;
  sendMessage: (payload: {
    to: string[];
    subject: string;
    bodyText: string;
    threadId?: string;
    isControlled?: boolean;
    expiryHours?: number;
    allowForwarding?: boolean;
    allowPrinting?: boolean;
    watermarkRecipient?: boolean;
    attachmentIds?: string[];
  }) => Promise<boolean>;
  uploadAttachment: (file: File, messageId?: string) => Promise<AttachmentApiResponse | null>;
  toggleStar: (threadId: string) => Promise<void>;
  markAsRead: (threadId: string) => Promise<void>;
  archiveThread: (threadId: string) => Promise<void>;
  trashThread: (threadId: string) => Promise<void>;
  markAsSpam: (threadId: string, isSpam: boolean) => Promise<void>;

  revokeEnvelope: (messageId: string, reason?: string) => Promise<boolean>;
  fetchEnvelopeAuditLogs: (messageId: string) => Promise<EnvelopeAuditLogDTO[]>;
  fetchEnvelopeStatus: (messageId: string) => Promise<ControlledEnvelopeDTO | null>;

  fetchUserFollowUps: () => Promise<void>;
  fetchThreadFollowUp: (threadId: string) => Promise<FollowUpReminderDTO | null>;
  createFollowUp: (payload: { threadId: string; durationHours?: number; dueAt?: string; condition?: FollowUpCondition; note?: string }) => Promise<FollowUpReminderDTO | null>;
  snoozeFollowUp: (id: string, additionalHours: number) => Promise<boolean>;
  dismissFollowUp: (id: string) => Promise<boolean>;
}

// Enterprise Contact Center & Mail Intelligence Mock Fixtures
const INITIAL_DEMO_THREADS: EmailThread[] = [
  {
    id: 'thread-urgent-1',
    subject: '[URGENT P0] Production Database Failover & Replication Lag Spike',
    snippet: 'URGENT: Primary PostgreSQL cluster in us-east-1 is experiencing 550ms replication lag. Immediate authorization needed to trigger replica failover before 2 PM peak traffic...',
    messageCount: 2,
    hasAttachments: false,
    lastMessageAt: '10:42 AM',
    isRead: false,
    isStarred: true,
    isSpam: false,
    priorityTier: 'URGENT',
    priorityScore: 0.98,
    priorityReason: 'P0 Database failover authorization required before 2:00 PM peak traffic.',
    labels: ['Operations', 'Urgent'],
    aiSummary: {
      overview: 'Critical replication lag (550ms) detected on primary PostgreSQL cluster in us-east-1. Lead DevOps Jane Cooper requests immediate executive sign-off to initiate replica promotion before the 2:00 PM peak customer traffic window.',
      decisions: [
        'Standby replica in us-east-2 verified and healthy.',
        'Downtime window estimated at under 45 seconds during DNS switch.'
      ],
      actionItems: [
        'Authorize database replica promotion before 2:00 PM EOD',
        'Verify read-replica connection pool drain'
      ],
      unresolvedQuestions: [
        'Have background batch ETL pipelines been paused?',
        'Has status page notification been drafted?'
      ],
      deadlines: ['Failover Window - Today 2:00 PM']
    },
    messages: [
      {
        id: 'msg-u1-1',
        threadId: 'thread-urgent-1',
        sender: { name: 'Jane Cooper', email: 'jane.cooper@infrastructure.cloud' },
        recipients: [{ name: 'Contact Center Operations', email: 'ops@nextmail.local' }],
        subject: '[URGENT P0] Production Database Failover & Replication Lag Spike',
        snippet: 'URGENT: Primary PostgreSQL cluster in us-east-1 is experiencing 550ms replication lag...',
        bodyText: `URGENT INCIDENT ALERT:

Primary PostgreSQL cluster in us-east-1 is experiencing 550ms replication lag due to a sudden volume spike. The standby read-replica in us-east-2 is completely in sync with zero data divergence.

We need immediate operational sign-off to initiate the automated Patroni failover before peak customer traffic begins at 2:00 PM EST.

Estimated disruption is under 45 seconds. Please confirm authorization immediately.

Jane Cooper
Lead Infrastructure & SRE`,
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
    id: 'thread-urgent-2',
    subject: '[URGENT] Wildcard SSL Certificate Expiring in 24 Hours for api.nextmail.local',
    snippet: 'Automated Certificate Monitor: Wildcard SSL certificate for *.nextmail.local expires in 23 hours. Automated Let\'s Encrypt challenge failed on DNS record...',
    messageCount: 1,
    hasAttachments: false,
    lastMessageAt: '09:15 AM',
    isRead: false,
    isStarred: false,
    isSpam: false,
    priorityTier: 'URGENT',
    priorityScore: 0.96,
    priorityReason: 'Imminent SSL outage; API traffic will be blocked by browsers if unresolved within 24h.',
    labels: ['DevOps', 'Urgent'],
    messages: [
      {
        id: 'msg-u2-1',
        threadId: 'thread-urgent-2',
        sender: { name: 'DevOps Sentry', email: 'alerts@pagerduty-cloud.net' },
        recipients: [{ name: 'SecOps Team', email: 'secops@nextmail.local' }],
        subject: '[URGENT] Wildcard SSL Certificate Expiring in 24 Hours for api.nextmail.local',
        snippet: 'Automated Certificate Monitor: Wildcard SSL certificate expires in 23 hours...',
        bodyText: `Automated Sentry Warning:

The wildcard SSL/TLS certificate for *.nextmail.local and internal microservices will expire in exactly 23 hours and 40 minutes.

The automated ACME HTTP-01 DNS challenge failed due to a routing timeout with Cloudflare edge DNS. Manual API token regeneration or DNS TXT validation is required immediately to prevent browser SSL warnings.

Action Required: Run the certificate reissuance pipeline or update Cloudflare API credentials.`,
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
    id: 'thread-important-1',
    subject: 'Enterprise Master Services Agreement (MSA) Q4 Renewal Terms',
    snippet: 'Following up on our contract renegotiation. Attached are the revised indemnity clauses and SLA commitments for your executive sign-off before Friday...',
    messageCount: 2,
    hasAttachments: true,
    lastMessageAt: 'Yesterday',
    isRead: true,
    isStarred: false,
    isSpam: false,
    priorityTier: 'IMPORTANT',
    priorityScore: 0.88,
    priorityReason: 'Executive contract sign-off requested with high-value SLA amendments.',
    labels: ['Legal', 'Contracts'],
    messages: [
      {
        id: 'msg-i1-1',
        threadId: 'thread-important-1',
        sender: { name: 'Ralph Edwards', email: 'ralph.e@vance-legal.com' },
        recipients: [{ name: 'Executive Team', email: 'admin@nextmail.local' }],
        subject: 'Enterprise Master Services Agreement (MSA) Q4 Renewal Terms',
        snippet: 'Following up on our contract renegotiation...',
        bodyText: `Dear Executive Team,

I have finalized the review of the Q4 Master Services Agreement with outside counsel. We have successfully negotiated a 99.99% SLA uptime tier and updated the data retention indemnity clause under Section 4.2.

Attached is the clean execution copy for your digital signature. Please confirm approval before Friday 5:00 PM EST so we can counter-sign with the enterprise customer.

Best regards,
Ralph Edwards
General Counsel, Vance Legal Partners`,
        sentAt: 'Yesterday',
        receivedAt: 'Yesterday',
        isRead: true,
        isStarred: false,
        attachments: [
          { id: 'att-msa-1', filename: 'Enterprise_MSA_Execution_v4.pdf', contentType: 'application/pdf', sizeBytes: 1840000 }
        ],
        securityFlags: { isPhishingRisk: false, spfValid: true, dkimValid: true, suspiciousLinksCount: 0 }
      }
    ]
  },
  {
    id: 'thread-important-2',
    subject: 'Series B Investment Syndicate Allocation & Board Observer Charter',
    snippet: 'Our investment committee has formally approved the $15M syndicate co-lead allocation. Let us schedule a partner discussion this Thursday to review the term sheet...',
    messageCount: 1,
    hasAttachments: true,
    lastMessageAt: 'Oct 8',
    isRead: true,
    isStarred: true,
    isSpam: false,
    priorityTier: 'IMPORTANT',
    priorityScore: 0.92,
    priorityReason: 'Series B term sheet allocation of $15M and partner governance meeting scheduling.',
    labels: ['Finance', 'Investors'],
    messages: [
      {
        id: 'msg-i2-1',
        threadId: 'thread-important-2',
        sender: { name: 'Esther Howard', email: 'esther.h@venture-partners.io' },
        recipients: [{ name: 'Founders', email: 'founders@nextmail.local' }],
        subject: 'Series B Investment Syndicate Allocation & Board Observer Charter',
        snippet: 'Our investment committee has formally approved the $15M syndicate co-lead allocation...',
        bodyText: `Dear Team,

Excited to share that our Investment Committee has unanimously voted to approve the $15,000,000 co-lead check for your Series B round.

We would like to convene a brief partner synchronization this Thursday at 2:30 PM to align on board observer representation and governance expectations.

Attached is the preliminary term sheet summary. Congratulations on the tremendous metrics!

Warmly,
Esther Howard
Managing Partner, Horizon Ventures`,
        sentAt: 'Oct 8',
        receivedAt: 'Oct 8',
        isRead: true,
        isStarred: true,
        attachments: [
          { id: 'att-term-1', filename: 'Series_B_Term_Sheet_Horizon.pdf', contentType: 'application/pdf', sizeBytes: 2450000 }
        ],
        securityFlags: { isPhishingRisk: false, spfValid: true, dkimValid: true, suspiciousLinksCount: 0 }
      }
    ]
  },
  {
    id: 'thread-important-3',
    subject: 'Acme Corp Enterprise Pilot Deployment & Okta SSO Verification',
    snippet: 'We have completed our Okta SAML 2.0 configuration on our staging tenant. Please verify the assertion consumer service URL and provision our initial 50 seats...',
    messageCount: 1,
    hasAttachments: false,
    lastMessageAt: 'Oct 7',
    isRead: true,
    isStarred: false,
    isSpam: false,
    priorityTier: 'IMPORTANT',
    priorityScore: 0.84,
    priorityReason: 'Enterprise pilot SSO deployment and user provisioning milestone.',
    labels: ['Customers', 'Onboarding'],
    messages: [
      {
        id: 'msg-i3-1',
        threadId: 'thread-important-3',
        sender: { name: 'Cameron Williamson', email: 'cameron.w@acme-corp.com' },
        recipients: [{ name: 'Integrations', email: 'integrations@nextmail.local' }],
        subject: 'Acme Corp Enterprise Pilot Deployment & Okta SSO Verification',
        snippet: 'We have completed our Okta SAML 2.0 configuration on our staging tenant...',
        bodyText: `Hi Integration Team,

Our IT security team has finalized the SAML 2.0 SSO app profile in Okta for Acme Corp.

Could you please verify our Assertion Consumer Service (ACS) endpoint and initialize the JIT provisioning for our 50 pilot agents?

Looking forward to testing the zero-trust envelopes during our live pilot.

Cameron Williamson
VP of Digital Workplace, Acme Corp`,
        sentAt: 'Oct 7',
        receivedAt: 'Oct 7',
        isRead: true,
        isStarred: false,
        attachments: [],
        securityFlags: { isPhishingRisk: false, spfValid: true, dkimValid: true, suspiciousLinksCount: 0 }
      }
    ]
  },
  {
    id: 'thread-spam-1',
    subject: '⚠️ CRITICAL: Unauthorized Access Detected on Your Account - Reset Password Now',
    snippet: 'Dear Customer, We detected an unauthorized login attempt from Moscow, Russia. Your balance of $28,450 has been temporarily frozen. Verify immediately...',
    messageCount: 1,
    hasAttachments: false,
    lastMessageAt: '08:20 AM',
    isRead: false,
    isStarred: false,
    isSpam: true,
    priorityTier: 'LOW',
    priorityScore: 0.05,
    priorityReason: 'Spam / Phishing: Spoofed domain mismatch, homograph character spoofing, credential phishing URL.',
    labels: ['Spam', 'Quarantine'],
    messages: [
      {
        id: 'msg-s1-1',
        threadId: 'thread-spam-1',
        sender: { name: 'Bank Security Desk', email: 'security-alert@paypaI-secure-login.net' },
        recipients: [{ name: 'Target Account', email: 'user@nextmail.local' }],
        subject: '⚠️ CRITICAL: Unauthorized Access Detected on Your Account - Reset Password Now',
        snippet: 'Dear Customer, We detected an unauthorized login attempt from Moscow, Russia...',
        bodyText: `SECURITY WARNING NOTICE:

We have detected suspicious unauthorized sign-in attempts from IP 185.220.101.4 (Moscow, Russian Federation) trying to access your corporate funds.

Your current active balance of $28,450.00 USD has been frozen to prevent theft.

To restore access immediately, you must verify your identity within 2 hours:
>> CLICK HERE TO VERIFY IDENTITY: http://192.168.1.104/credential-verify-login.php?user=target

Failure to verify will result in permanent account forfeiture.

Global Security Desk`,
        sentAt: '08:20 AM',
        receivedAt: '08:20 AM',
        isRead: false,
        isStarred: false,
        attachments: [],
        securityFlags: {
          isPhishingRisk: true,
          spfValid: false,
          dkimValid: false,
          suspiciousLinksCount: 4,
          riskReason: "Domain spoofing detected ('paypaI-secure-login.net'), failed SPF/DKIM authentication, malicious credential harvesting link."
        }
      }
    ]
  },
  {
    id: 'thread-spam-2',
    subject: 'Guaranteed 400% Weekly Return - Automated Crypto Arbitrage Fund Allocation',
    snippet: 'Confidential Investment Notice: Deposit 2.5 ETH or $5,000 USDT to automated vault address 0x889... and receive guaranteed daily payouts. Limited slots remaining...',
    messageCount: 1,
    hasAttachments: false,
    lastMessageAt: 'Oct 6',
    isRead: true,
    isStarred: false,
    isSpam: true,
    priorityTier: 'LOW',
    priorityScore: 0.02,
    priorityReason: 'Spam / Fraud: Unsolicited cryptocurrency wealth transfer solicitation from untrusted TLD.',
    labels: ['Spam'],
    messages: [
      {
        id: 'msg-s2-1',
        threadId: 'thread-spam-2',
        sender: { name: 'Prof. Robert Fox', email: 'wealth-allocations@crypto-vault-arbitrage.xyz' },
        recipients: [{ name: 'Recipient', email: 'user@nextmail.local' }],
        subject: 'Guaranteed 400% Weekly Return - Automated Crypto Arbitrage Fund Allocation',
        snippet: 'Deposit 2.5 ETH or $5,000 USDT to automated vault address 0x889...',
        bodyText: `Exclusive Wealth Invitation:

I am managing an algorithmic multi-exchange Flash Loan arbitrage pool delivering 400% weekly guaranteed profit without market exposure.

Deposit 2.5 ETH or 5,000 USDT to smart contract pool 0x889A...c21 and payouts start every 24 hours directly to your wallet.

Only 3 investor allocations remaining before the pool closes permanently.`,
        sentAt: 'Oct 6',
        receivedAt: 'Oct 6',
        isRead: true,
        isStarred: false,
        attachments: [],
        securityFlags: {
          isPhishingRisk: true,
          spfValid: false,
          dkimValid: false,
          suspiciousLinksCount: 2,
          riskReason: "Blacklisted origin IP, high-confidence financial scam pattern, failed SPF."
        }
      }
    ]
  },
  {
    id: 'thread-normal-1',
    subject: 'Sprint 42 Retrospective Notes & Contact Center Metrics Review',
    snippet: 'Team, the Sprint 42 retrospective notes and contact center resolution benchmarks are published on Confluence. Average first-response time dropped to 1.8 minutes...',
    messageCount: 1,
    hasAttachments: false,
    lastMessageAt: 'Oct 5',
    isRead: true,
    isStarred: false,
    isSpam: false,
    priorityTier: 'NORMAL',
    priorityScore: 0.55,
    priorityReason: 'Routine operational retrospective report within standard SLA.',
    labels: ['Operations', 'Support'],
    messages: [
      {
        id: 'msg-n1-1',
        threadId: 'thread-normal-1',
        sender: { name: 'Wade Warren', email: 'wade.w@support-ops.com' },
        recipients: [{ name: 'Support Team', email: 'support@nextmail.local' }],
        subject: 'Sprint 42 Retrospective Notes & Contact Center Metrics Review',
        snippet: 'The Sprint 42 retrospective notes are published...',
        bodyText: `Hey everyone,

Sprint 42 retrospective notes are now live on Confluence.

Key Highlights:
- Average First Response Time: 1.8 minutes (down 24%)
- AI Auto-Categorization Accuracy: 94.2%
- CSAT Score: 4.85 / 5.0

Great effort from all shifts. Let's keep this momentum going into Sprint 43 planning on Monday.

Wade Warren
Contact Center Operations Manager`,
        sentAt: 'Oct 5',
        receivedAt: 'Oct 5',
        isRead: true,
        isStarred: false,
        attachments: [],
        securityFlags: { isPhishingRisk: false, spfValid: true, dkimValid: true, suspiciousLinksCount: 0 }
      }
    ]
  },
  {
    id: 'thread-normal-2',
    subject: 'Design System 2.0 Iconography & Component Tokens Update',
    snippet: 'Hi team! We just published the updated Figma token library for Design System 2.0 with the new mojo cx emerald palette. Let us know your feedback during sprint planning...',
    messageCount: 1,
    hasAttachments: false,
    lastMessageAt: 'Oct 4',
    isRead: true,
    isStarred: false,
    isSpam: false,
    priorityTier: 'NORMAL',
    priorityScore: 0.50,
    priorityReason: 'Routine design system update within standard response window.',
    labels: ['Design', 'Product'],
    messages: [
      {
        id: 'msg-n2-1',
        threadId: 'thread-normal-2',
        sender: { name: 'Jenny Wilson', email: 'jenny.w@design-studio.co' },
        recipients: [{ name: 'Frontend Guild', email: 'frontend@nextmail.local' }],
        subject: 'Design System 2.0 Iconography & Component Tokens Update',
        snippet: 'We just published the updated Figma token library...',
        bodyText: `Hello Designers & Engineers,

Design System 2.0 component library is finalized!

Includes:
- High-contrast emerald accents (#00D084)
- Crisp dark sidebar components (#0E1318)
- Standardized badge tokens for Urgent, Important, Normal, and Spam
- Accessibility verified against WCAG AAA contrast guidelines

Please import the latest npm package @design/mojo-tokens@2.1.0 in your next PR.

Jenny Wilson
Lead Product Designer`,
        sentAt: 'Oct 4',
        receivedAt: 'Oct 4',
        isRead: true,
        isStarred: false,
        attachments: [],
        securityFlags: { isPhishingRisk: false, spfValid: true, dkimValid: true, suspiciousLinksCount: 0 }
      }
    ]
  }
];

const INITIAL_DEMO_SUMMARIES: Record<string, AiSummaryResponse> = {
  'thread-urgent-1': {
    threadId: 'thread-urgent-1',
    overview: 'Critical replication lag (550ms) detected on primary PostgreSQL cluster in us-east-1. Lead DevOps Jane Cooper requests immediate executive sign-off to initiate replica promotion before the 2:00 PM peak customer traffic window.',
    keyDecisions: [
      'Standby replica in us-east-2 verified and healthy with zero data divergence.',
      'Cutover disruption estimated at under 45 seconds during DNS switch.'
    ],
    actionItems: [
      { task: 'Authorize database replica promotion before 2:00 PM EOD', assignee: 'Operations Lead', dueSuggestion: 'Immediate' },
      { task: 'Verify read-replica connection pool drain', assignee: 'Jane Cooper', dueSuggestion: '1:45 PM' }
    ],
    unresolvedQuestions: [
      'Have background batch ETL pipelines been paused?',
      'Has status page maintenance notification been drafted?'
    ],
    priorityTier: 'URGENT',
    priorityScore: 0.98,
    priorityReason: 'P0 Database failover authorization required before 2:00 PM peak traffic.',
    suggestedAction: 'Authorize failover immediately to prevent transaction queue backlog.',
    modelUsed: 'gemini-1.5-flash',
    generatedAt: new Date().toISOString()
  },
  'thread-urgent-2': {
    threadId: 'thread-urgent-2',
    overview: 'Automated certificate authority monitor detected that the wildcard SSL/TLS certificate for *.nextmail.local expires in under 24 hours. Automated HTTP-01 challenge failed on Cloudflare DNS timeout.',
    keyDecisions: [
      'Manual DNS TXT challenge authorization required.',
      'Emergency maintenance pipeline queued.'
    ],
    actionItems: [
      { task: 'Reissue wildcard SSL cert via manual DNS challenge', assignee: 'SecOps Team', dueSuggestion: 'Today, within 4h' }
    ],
    unresolvedQuestions: [
      'Is Cloudflare API token expired or restricted?'
    ],
    priorityTier: 'URGENT',
    priorityScore: 0.96,
    priorityReason: 'Imminent SSL outage; API traffic will be blocked by browsers if unresolved within 24h.',
    suggestedAction: 'Execute SSL renewal pipeline immediately.',
    modelUsed: 'gemini-1.5-flash',
    generatedAt: new Date().toISOString()
  },
  'thread-important-1': {
    threadId: 'thread-important-1',
    overview: 'General Counsel Ralph Edwards has finalized the Q4 Master Services Agreement (MSA) with outside counsel, securing 99.99% SLA terms and capped 7-year data retention indemnity.',
    keyDecisions: [
      'Agreed to 99.99% uptime commitment with penalty credits.',
      'Section 4.2 data retention indemnity approved by legal.'
    ],
    actionItems: [
      { task: 'Review redlined indemnity section 4.2', assignee: 'Executive Team', dueSuggestion: 'Friday, 5:00 PM' },
      { task: 'Obtain CFO signature on pricing addendum', assignee: 'Ralph Edwards', dueSuggestion: 'Monday' }
    ],
    unresolvedQuestions: [
      'Does the revised SLA require multi-region active-active deployment?'
    ],
    priorityTier: 'IMPORTANT',
    priorityScore: 0.88,
    priorityReason: 'Executive contract sign-off requested with high-value SLA amendments.',
    suggestedAction: 'Review section 4.2 and approve signature execution.',
    modelUsed: 'gemini-1.5-flash',
    generatedAt: new Date().toISOString()
  },
  'thread-spam-1': {
    threadId: 'thread-spam-1',
    overview: 'SECURITY THREAT ISOLATED: High-confidence phishing attack spoofing payment brand using homograph character domain ("paypaI-secure-login.net"). Automated quarantine enforced.',
    keyDecisions: [
      'Quarantine rule enforced automatically upon ingestion.',
      'Outbound firewall rules updated to block malicious phishing URL.'
    ],
    actionItems: [
      { task: 'Permanently shred and add domain to global blocklist', assignee: 'SecOps Sentry', dueSuggestion: 'Immediate' }
    ],
    unresolvedQuestions: [
      'Did any internal user click the credential link prior to quarantine?'
    ],
    priorityTier: 'LOW',
    priorityScore: 0.05,
    priorityReason: 'Content-Based Spam Shield: Detected credential phishing, domain homograph, and failed SPF/DKIM.',
    suggestedAction: 'Keep in quarantine and block sender domain.',
    modelUsed: 'gemini-1.5-flash',
    generatedAt: new Date().toISOString()
  }
};

const INITIAL_DEMO_FOLLOWUPS: FollowUpReminderDTO[] = [
  {
    id: 'followup-1',
    userId: 'user-demo-1',
    threadId: 'thread-urgent-1',
    threadSubject: '[URGENT P0] Production Database Failover & Replication Lag Spike',
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    condition: 'NO_REPLY_RECEIVED',
    status: 'PENDING',
    note: 'Awaiting confirmation on PostgreSQL replica promotion before 2 PM peak',
    createdAt: new Date().toISOString()
  },
  {
    id: 'followup-2',
    userId: 'user-demo-1',
    threadId: 'thread-important-1',
    threadSubject: 'Enterprise Master Services Agreement (MSA) Q4 Renewal Terms',
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    condition: 'NO_REPLY_RECEIVED',
    status: 'PENDING',
    note: 'Follow up with Ralph Edwards on MSA Section 4.2 redlines',
    createdAt: new Date().toISOString()
  },
  {
    id: 'followup-3',
    userId: 'user-demo-1',
    threadId: 'thread-important-2',
    threadSubject: 'Series B Investment Syndicate Allocation & Board Observer Charter',
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    condition: 'NO_REPLY_RECEIVED',
    status: 'PENDING',
    note: 'Review Series B board observer charter with Esther Howard',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    userId: 'user-demo-1',
    type: 'THREAD_PRIORITY_ESCALATED',
    title: 'Urgent Thread Escalated',
    message: "Thread '[URGENT P0] Database Failover' escalated to 98% priority score.",
    threadId: 'thread-urgent-1',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'notif-2',
    userId: 'user-demo-1',
    type: 'SECURITY_ALERT',
    title: 'Spam & Phishing Blocked',
    message: "Inbound message from 'security-alert@paypaI-secure-login.net' quarantined.",
    threadId: 'thread-spam-1',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

export const useMailStore = create<MailState>((set, get) => ({
  currentFolder: 'inbox',
  selectedThreadId: 'thread-urgent-1',
  threads: INITIAL_DEMO_THREADS,
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  searchEngine: null,
  searchTotal: 0,
  isComposeOpen: false,
  isAIThinking: false,
  isLoadingThreads: false,
  threadSummaries: INITIAL_DEMO_SUMMARIES,
  isLoadingSummary: false,
  activeFollowUps: INITIAL_DEMO_FOLLOWUPS,
  activeThreadFollowUp: INITIAL_DEMO_FOLLOWUPS[0],
  notifications: INITIAL_DEMO_NOTIFICATIONS,
  unreadNotificationsCount: 2,
  isNotificationsOpen: false,

  setIsNotificationsOpen: (open) => set({ isNotificationsOpen: open }),

  setCurrentFolder: (folder) => {
    set({ currentFolder: folder, selectedThreadId: null });
    get().fetchThreads(folder);
  },

  setSelectedThreadId: (id) => {
    set({ selectedThreadId: id });
    if (id) {
      // Find matching follow-up if present
      const followUp = get().activeFollowUps.find((f) => f.threadId === id) || null;
      set({ activeThreadFollowUp: followUp });

      if (!id.startsWith('thread-')) {
        get().fetchThreadDetail(id);
        get().fetchThreadFollowUp(id);
      }
      get().fetchThreadSummary(id);
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

    const token = localStorage.getItem('nextmail_token');
    if (token) {
      set({ isSearching: true });
      try {
        const folderParam = folder ? `&folder=${folder.toUpperCase()}` : '';
        const res = await apiClient.get<PageResponse<SearchResultDTO>>(
          `/search?q=${encodeURIComponent(query)}${folderParam}`
        );
        if (res.data) {
          set({
            searchResults: res.data.content || [],
            searchEngine: 'ELASTICSEARCH',
            searchTotal: res.data.totalElements || 0,
            isSearching: false,
          });
          return;
        }
      } catch (err) {
        console.warn('Backend search unavailable, falling back to local indexing:', err);
      }
    }

    // Client fallback search for demo mode
    const q = query.toLowerCase();
    const filtered = get().threads.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.snippet.toLowerCase().includes(q) ||
        (t.priorityReason && t.priorityReason.toLowerCase().includes(q))
    );
    const mockResults: SearchResultDTO[] = filtered.map((t) => ({
      messageId: t.id,
      threadId: t.id,
      subject: t.subject,
      snippet: t.snippet,
      highlightedSnippet: t.snippet.replace(
        new RegExp(`(${query})`, 'gi'),
        '<mark class="bg-emerald-400/25 text-emerald-900 px-0.5 rounded font-semibold">$1</mark>'
      ),
      senderEmail: t.messages?.[0]?.sender.email || 'user@nextmail.local',
      senderName: t.messages?.[0]?.sender.name || 'NextMail Workspace',
      recipientEmails: ['ops@nextmail.local'],
      folder: t.isSpam ? 'SPAM' : 'INBOX',
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
    if (!token) return;

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
          isSpam: t.isSpam,
          isArchived: t.isArchived,
          isTrash: t.isTrash,
          priorityTier: t.priorityTier,
          priorityScore: t.priorityScore,
          priorityReason: t.priorityReason,
          labels: t.labels || [],
        }));
        set({ threads: liveThreads, isLoadingThreads: false });
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch live threads:', err);
    } finally {
      set({ isLoadingThreads: false });
    }
  },

  fetchThreadDetail: async (threadId) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) return;

    try {
      const res = await apiClient.get<ThreadDetailApiResponse>(`/mail/threads/${threadId}`);
      if (res.data) {
        const detail = res.data;
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  messages: detail.messages.map((m) => ({
                    id: m.id,
                    threadId: m.threadId,
                    sender: { name: m.senderName, email: m.senderEmail },
                    recipients: m.recipients.map((r) => ({ name: r.name, email: r.email })),
                    subject: m.subject,
                    snippet: m.bodyText.length > 100 ? m.bodyText.substring(0, 97) + '...' : m.bodyText,
                    bodyText: m.bodyText,
                    bodyHtml: m.bodyHtml,
                    sentAt: new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    receivedAt: new Date(m.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isRead: m.isRead,
                    isStarred: m.isStarred,
                    isControlled: m.isControlled,
                    expiresAt: m.expiresAt,
                    isExpired: m.isExpired,
                    isRevoked: m.isRevoked,
                    allowForwarding: m.allowForwarding,
                    allowPrinting: m.allowPrinting,
                    watermarkRecipient: m.watermarkRecipient,
                    attachments: (m.attachments || []).map((a) => ({
                      id: a.id,
                      filename: a.filename,
                      contentType: a.detectedContentType,
                      sizeBytes: a.sizeBytes,
                    })),
                    securityFlags: {
                      isPhishingRisk: false,
                      spfValid: true,
                      dkimValid: true,
                      suspiciousLinksCount: 0,
                    },
                  })),
                }
              : t
          ),
        }));
      }
    } catch {
      // Ignore
    }
  },

  uploadAttachment: async (file: File, messageId?: string) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) {
      alert('Please sign in to upload attachments');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (messageId) {
        formData.append('messageId', messageId);
      }
      const res = await apiClient.upload<AttachmentApiResponse>('/attachments/upload', formData);
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      alert(msg);
      return null;
    }
  },

  sendMessage: async (payload) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) {
      // Demo mode optimistic message send
      const newMsg = {
        id: `msg-demo-${Date.now()}`,
        threadId: payload.threadId || `thread-demo-${Date.now()}`,
        sender: { name: 'You (Operations)', email: 'admin@nextmail.local' },
        recipients: payload.to.map((e) => ({ email: e })),
        subject: payload.subject,
        snippet: payload.bodyText.substring(0, 100),
        bodyText: payload.bodyText,
        sentAt: 'Just now',
        receivedAt: 'Just now',
        isRead: true,
        isStarred: false,
        attachments: [],
        securityFlags: { isPhishingRisk: false, spfValid: true, dkimValid: true, suspiciousLinksCount: 0 },
      };

      if (payload.threadId) {
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === payload.threadId
              ? { ...t, messages: [...(t.messages || []), newMsg], lastMessageAt: 'Just now' }
              : t
          ),
        }));
      }
      return true;
    }

    try {
      await apiClient.post('/mail/send', {
        to: payload.to,
        subject: payload.subject,
        bodyText: payload.bodyText,
        threadId: payload.threadId && !payload.threadId.startsWith('thread-') ? payload.threadId : undefined,
        isControlled: payload.isControlled || false,
        expiryHours: payload.expiryHours || 48,
        allowForwarding: payload.allowForwarding || false,
        allowPrinting: payload.allowPrinting || false,
        watermarkRecipient: payload.watermarkRecipient !== false,
        attachmentIds: payload.attachmentIds,
      });

      await get().fetchThreads();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      alert(msg);
      return false;
    }
  },

  toggleStar: async (threadId) => {
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
        // Ignore
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
        // Ignore
      }
    }
  },

  markAsSpam: async (threadId, isSpam) => {
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              isSpam,
              priorityTier: isSpam ? 'LOW' : t.priorityTier,
              priorityReason: isSpam
                ? 'User flagged as unsolicited spam & moved to quarantine.'
                : 'Marked as safe by user.',
            }
          : t
      ),
    }));

    const token = localStorage.getItem('nextmail_token');
    if (token && !threadId.startsWith('thread-')) {
      try {
        await apiClient.patch(`/mail/threads/${threadId}/spam?isSpam=${isSpam}`);
      } catch {
        // Handled optimistically
      }
    }
  },

  fetchThreadSummary: async (threadId) => {
    const existing = get().threadSummaries[threadId];
    if (existing) return existing;

    const token = localStorage.getItem('nextmail_token');
    if (token && !threadId.startsWith('thread-')) {
      set({ isLoadingSummary: true });
      try {
        const res = await apiClient.get<AiSummaryResponse>(`/ai/threads/${threadId}/summary`);
        if (res.data) {
          set((state) => ({
            threadSummaries: { ...state.threadSummaries, [threadId]: res.data },
            isLoadingSummary: false,
          }));
          return res.data;
        }
      } catch (err) {
        console.warn('Failed to fetch AI summary from backend:', err);
      } finally {
        set({ isLoadingSummary: false });
      }
    }

    const thread = get().threads.find((t) => t.id === threadId);
    if (thread?.aiSummary) {
      const mockSummary: AiSummaryResponse = {
        threadId,
        overview: thread.aiSummary.overview,
        keyDecisions: thread.aiSummary.decisions,
        actionItems: thread.aiSummary.actionItems.map((a) => ({
          task: a,
          assignee: 'Operations',
          dueSuggestion: 'Today, 2:00 PM',
        })),
        unresolvedQuestions: thread.aiSummary.unresolvedQuestions,
        priorityTier: thread.priorityTier,
        priorityScore: thread.priorityScore,
        priorityReason: thread.priorityReason,
        suggestedAction: 'Review details and execute required operational task.',
        modelUsed: 'gemini-1.5-flash',
        generatedAt: new Date().toISOString(),
      };
      set((state) => ({
        threadSummaries: { ...state.threadSummaries, [threadId]: mockSummary },
      }));
      return mockSummary;
    }
    return null;
  },

  generateAiReply: async (threadId, tone, instructions) => {
    const token = localStorage.getItem('nextmail_token');
    if (token && !threadId.startsWith('thread-')) {
      try {
        const res = await apiClient.post<AiReplyResponse>(`/ai/threads/${threadId}/reply`, {
          tone: tone.toUpperCase(),
          instructions,
        });
        if (res.data?.suggestedReplyText) {
          return res.data.suggestedReplyText;
        }
      } catch (err) {
        console.warn('Failed to generate AI reply via backend API:', err);
      }
    }

    // High-context Demo fixture generation
    const thread = get().threads.find((t) => t.id === threadId);
    const sender = thread?.messages?.[0]?.sender.name?.split(' ')[0] || 'there';
    const custom = instructions ? `\n\nRegarding your note: ${instructions}.` : '';

    if (tone === 'Concise') {
      return `Hi ${sender},\n\nReceived and authorized. We are proceeding with the scheduled window immediately.${custom}\n\nThanks,\nOperations Team`;
    } else if (tone === 'Firm') {
      return `Hi ${sender},\n\nPlease be advised that approval is conditionally granted under strict SLA monitoring. Confirm full telemetry validation once live.${custom}\n\nRegards,\nOperations Lead`;
    } else if (tone === 'Friendly') {
      return `Hey ${sender},\n\nThanks so much for the swift heads-up! We've reviewed all metrics and everything looks solid to move ahead.${custom}\n\nBest,\nNextMail Operations`;
    } else if (tone === 'Technical') {
      return `Hi ${sender},\n\nI have reviewed the architecture runbook and cluster lag metrics. Ensure connection pools are drained gracefully before flipping DNS.${custom}\n\nBest regards,\nStaff Infrastructure Lead`;
    } else {
      return `Hi ${sender},\n\nThank you for the detailed briefing regarding '${thread?.subject || 'this task'}'. We have reviewed the action items and confirmed our approval.${custom}\n\nBest regards,\nNextMail Operations`;
    }
  },

  fetchUserFollowUps: async () => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) return;
    try {
      const res = await apiClient.get<FollowUpReminderDTO[]>('/workflow/followups');
      if (res.data) {
        set({ activeFollowUps: res.data });
      }
    } catch (err) {
      console.warn('Failed to fetch user follow-ups:', err);
    }
  },

  fetchThreadFollowUp: async (threadId: string) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token || threadId.startsWith('thread-')) {
      const followUp = get().activeFollowUps.find((f) => f.threadId === threadId) || null;
      set({ activeThreadFollowUp: followUp });
      return followUp;
    }
    try {
      const res = await apiClient.get<FollowUpReminderDTO>(`/workflow/followups/thread/${threadId}`);
      if (res.data) {
        set({ activeThreadFollowUp: res.data });
        return res.data;
      }
    } catch {
      // Ignore
    }
    set({ activeThreadFollowUp: null });
    return null;
  },

  createFollowUp: async (payload) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token || payload.threadId.startsWith('thread-')) {
      // Local optimistic follow-up creation
      const hours = payload.durationHours || 24;
      const newFollowUp: FollowUpReminderDTO = {
        id: `followup-mock-${Date.now()}`,
        userId: 'current-user',
        threadId: payload.threadId,
        threadSubject: get().threads.find((t) => t.id === payload.threadId)?.subject || 'Follow-up Task',
        dueAt: payload.dueAt || new Date(Date.now() + 1000 * 60 * 60 * hours).toISOString(),
        condition: payload.condition || 'NO_REPLY_RECEIVED',
        status: 'PENDING',
        note: payload.note || 'Scheduled priority task',
        createdAt: new Date().toISOString(),
      };
      set((state) => ({
        activeFollowUps: [...state.activeFollowUps.filter((f) => f.threadId !== payload.threadId), newFollowUp],
        activeThreadFollowUp: newFollowUp,
      }));
      return newFollowUp;
    }

    try {
      const res = await apiClient.post<FollowUpReminderDTO>('/workflow/followups', {
        threadId: payload.threadId,
        durationHours: payload.durationHours || 24,
        dueAt: payload.dueAt,
        condition: payload.condition || 'NO_REPLY_RECEIVED',
        note: payload.note,
      });
      if (res.data) {
        set({ activeThreadFollowUp: res.data });
        get().fetchUserFollowUps();
        return res.data;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule follow-up';
      alert(msg);
    }
    return null;
  },

  snoozeFollowUp: async (id, additionalHours) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token || id.startsWith('followup-mock-') || id.startsWith('followup-')) {
      set((state) => {
        const updated = state.activeFollowUps.map((f) =>
          f.id === id
            ? {
                ...f,
                dueAt: new Date(new Date(f.dueAt).getTime() + 1000 * 60 * 60 * additionalHours).toISOString(),
                status: 'SNOOZED' as FollowUpStatus,
              }
            : f
        );
        const current = updated.find((f) => f.id === id) || null;
        return { activeFollowUps: updated, activeThreadFollowUp: current };
      });
      return true;
    }

    try {
      const res = await apiClient.post<FollowUpReminderDTO>(`/workflow/followups/${id}/snooze`, {
        additionalHours,
      });
      if (res.data) {
        set({ activeThreadFollowUp: res.data });
        get().fetchUserFollowUps();
        return true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to snooze follow-up';
      alert(msg);
    }
    return false;
  },

  dismissFollowUp: async (id) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token || id.startsWith('followup-mock-') || id.startsWith('followup-')) {
      set((state) => ({
        activeFollowUps: state.activeFollowUps.filter((f) => f.id !== id),
        activeThreadFollowUp: null,
      }));
      return true;
    }

    try {
      await apiClient.delete(`/workflow/followups/${id}`);
      set({ activeThreadFollowUp: null });
      get().fetchUserFollowUps();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to dismiss follow-up';
      alert(msg);
    }
    return false;
  },

  fetchNotifications: async () => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) return;
    try {
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      if (res.data) {
        set({ notifications: res.data });
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  },

  fetchUnreadNotificationsCount: async () => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) return;
    try {
      const res = await apiClient.get<number>('/notifications/unread-count');
      if (typeof res.data === 'number') {
        set({ unreadNotificationsCount: res.data });
      }
    } catch {
      // Ignore
    }
  },

  markNotificationRead: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadNotificationsCount: Math.max(0, state.unreadNotificationsCount - 1),
    }));

    const token = localStorage.getItem('nextmail_token');
    if (token) {
      try {
        await apiClient.patch(`/notifications/${id}/read`);
      } catch {
        // Rollback not critical
      }
    }
  },

  markAllNotificationsRead: async () => {
    const token = localStorage.getItem('nextmail_token');
    if (token) {
      try {
        await apiClient.post('/notifications/mark-all-read');
      } catch {
        // Ignore
      }
    }
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadNotificationsCount: 0,
    }));
  },

  initializeWebSocket: (userId: string, token: string) => {
    webSocketService.connect(token);

    const unsubNotifications = webSocketService.subscribe(
      `/topic/user/${userId}/notifications`,
      (notification: NotificationItem) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadNotificationsCount: state.unreadNotificationsCount + 1,
        }));
      }
    );

    const unsubInbox = webSocketService.subscribe(
      `/topic/user/${userId}/inbox`,
      (signal: { action?: string; threadId?: string }) => {
        if (signal?.action === 'REFRESH_INBOX') {
          get().fetchThreads();
          if (signal.threadId && get().selectedThreadId === signal.threadId) {
            get().fetchThreadDetail(signal.threadId);
          }
        }
      }
    );

    return () => {
      unsubNotifications();
      unsubInbox();
      webSocketService.disconnect();
    };
  },

  revokeEnvelope: async (messageId: string, reason?: string) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) {
      alert('Please sign in to revoke envelope');
      return false;
    }
    try {
      const res = await apiClient.post<ControlledEnvelopeDTO>(`/controlled/${messageId}/revoke`, {
        reason: reason || 'Sender revoked access on demand',
      });
      if (res.data) {
        set((state) => ({
          threads: state.threads.map((t) => ({
            ...t,
            messages: (t.messages || []).map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    isRevoked: true,
                    bodyText:
                      '[CONTROLLED ENVELOPE REVOKED]\nAccess to this confidential message was revoked by the sender. In accordance with NextMail Zero-Trust policy, content has been shredded.',
                    bodyHtml:
                      '<div style="padding: 16px; background-color: #0f172a; border: 1px solid rgba(244,63,94,0.3); border-radius: 8px; color: #fb7185; font-family: monospace; font-size: 13px;"><strong>[CONTROLLED ENVELOPE REVOKED]</strong><br/>Access to this message was revoked by the sender. Content has been cryptographically shredded.</div>',
                    attachments: [],
                  }
                : m
            ),
          })),
        }));
        return true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke envelope';
      alert(msg);
    }
    return false;
  },

  fetchEnvelopeAuditLogs: async (messageId: string) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) return [];
    try {
      const res = await apiClient.get<EnvelopeAuditLogDTO[]>(`/controlled/${messageId}/audit-logs`);
      return res.data || [];
    } catch (err) {
      console.warn('Failed to fetch envelope audit logs:', err);
      return [];
    }
  },

  fetchEnvelopeStatus: async (messageId: string) => {
    const token = localStorage.getItem('nextmail_token');
    if (!token) return null;
    try {
      const res = await apiClient.get<ControlledEnvelopeDTO>(`/controlled/${messageId}/status`);
      return res.data || null;
    } catch {
      return null;
    }
  },
}));
