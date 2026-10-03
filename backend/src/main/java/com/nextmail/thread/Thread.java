package com.nextmail.thread;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "threads", indexes = {
        @Index(name = "idx_threads_user_last_msg", columnList = "user_id, last_message_at DESC"),
        @Index(name = "idx_threads_user_priority", columnList = "user_id, priority_tier"),
        @Index(name = "idx_threads_normalized_sub", columnList = "user_id, subject_normalized")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Thread {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 500)
    private String subject;

    @Column(name = "subject_normalized", nullable = false, length = 500)
    private String subjectNormalized;

    @Column(length = 1000)
    private String snippet;

    @Column(name = "first_message_at", nullable = false)
    private Instant firstMessageAt;

    @Column(name = "last_message_at", nullable = false)
    private Instant lastMessageAt;

    @Column(name = "message_count", nullable = false)
    @Builder.Default
    private int messageCount = 1;

    @Column(name = "has_attachments", nullable = false)
    @Builder.Default
    private boolean hasAttachments = false;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "is_starred", nullable = false)
    @Builder.Default
    private boolean isStarred = false;

    @Column(name = "is_archived", nullable = false)
    @Builder.Default
    private boolean isArchived = false;

    @Column(name = "is_spam", nullable = false)
    @Builder.Default
    private boolean isSpam = false;

    @Column(name = "is_trash", nullable = false)
    @Builder.Default
    private boolean isTrash = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority_tier", nullable = false, length = 32)
    @Builder.Default
    private PriorityTier priorityTier = PriorityTier.NORMAL;

    @Column(name = "priority_score")
    @Builder.Default
    private Double priorityScore = 0.5;

    @Column(name = "priority_reason", length = 500)
    private String priorityReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
