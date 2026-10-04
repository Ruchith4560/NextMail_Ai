export type MailboxFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam' | 'starred';

export type PriorityTier = 'URGENT' | 'IMPORTANT' | 'NORMAL' | 'LOW';

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface AttachmentMetadata {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  isMalicious?: boolean;
}

export interface ThreadSummary {
  overview: string;
  decisions: string[];
  actionItems: string[];
  unresolvedQuestions: string[];
  deadlines: string[];
}

export interface EmailMessage {
  id: string;
  threadId: string;
  sender: EmailAddress;
  recipients: EmailAddress[];
  subject: string;
  snippet: string;
  bodyText: string;
  bodyHtml?: string;
  sentAt: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isControlled?: boolean;
  expiresAt?: string;
  isExpired?: boolean;
  isRevoked?: boolean;
  allowForwarding?: boolean;
  allowPrinting?: boolean;
  watermarkRecipient?: boolean;
  attachments: AttachmentMetadata[];
  securityFlags?: {
    isPhishingRisk: boolean;
    spfValid: boolean;
    dkimValid: boolean;
    suspiciousLinksCount: number;
    riskReason?: string;
  };
}

export interface EmailThread {
  id: string;
  subject: string;
  snippet: string;
  messageCount: number;
  hasAttachments: boolean;
  lastMessageAt: string;
  isRead: boolean;
  isStarred: boolean;
  priorityTier: PriorityTier;
  priorityScore: number;
  priorityReason: string;
  labels: string[];
  messages?: EmailMessage[];
  aiSummary?: ThreadSummary;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
}
