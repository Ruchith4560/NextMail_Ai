package com.nextmail.mail;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "messages", indexes = {
        @Index(name = "idx_messages_thread_sent", columnList = "thread_id, sent_at ASC"),
        @Index(name = "idx_messages_user_received", columnList = "user_id, received_at DESC"),
        @Index(name = "idx_messages_msg_id_header", columnList = "message_id_header")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "thread_id", nullable = false)
    private UUID threadId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "message_id_header", nullable = false, length = 255)
    private String messageIdHeader;

    @Column(name = "in_reply_to", length = 255)
    private String inReplyTo;

    @Column(name = "references_header", columnDefinition = "TEXT")
    private String referencesHeader;

    @Column(name = "sender_email", nullable = false, length = 255)
    private String senderEmail;

    @Column(name = "sender_name", length = 255)
    private String senderName;

    @Column(nullable = false, length = 500)
    private String subject;

    @Column(name = "body_text", columnDefinition = "TEXT")
    private String bodyText;

    @Column(name = "body_html", columnDefinition = "TEXT")
    private String bodyHtml;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "is_starred", nullable = false)
    @Builder.Default
    private boolean isStarred = false;

    @Column(name = "is_draft", nullable = false)
    @Builder.Default
    private boolean isDraft = false;

    @Column(name = "is_controlled", nullable = false)
    @Builder.Default
    private boolean isControlled = false;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private MailFolder folder = MailFolder.INBOX;

    @Column(name = "has_attachments", nullable = false)
    @Builder.Default
    private boolean hasAttachments = false;

    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<MessageRecipient> recipients = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public void addRecipient(MessageRecipient recipient) {
        recipients.add(recipient);
        recipient.setMessage(this);
    }
}
