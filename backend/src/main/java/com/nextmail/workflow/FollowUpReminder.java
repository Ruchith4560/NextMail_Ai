package com.nextmail.workflow;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "follow_up_reminders", indexes = {
        @Index(name = "idx_followup_user_status", columnList = "user_id, status"),
        @Index(name = "idx_followup_status_due", columnList = "status, due_at"),
        @Index(name = "idx_followup_thread", columnList = "thread_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowUpReminder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "thread_id", nullable = false)
    private UUID threadId;

    @Column(name = "message_id")
    private UUID messageId;

    @Column(name = "due_at", nullable = false)
    private Instant dueAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition", nullable = false, length = 32)
    @Builder.Default
    private FollowUpCondition condition = FollowUpCondition.NO_REPLY_RECEIVED;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    @Builder.Default
    private FollowUpStatus status = FollowUpStatus.PENDING;

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "original_last_message_at", nullable = false)
    private Instant originalLastMessageAt;

    @Column(name = "triggered_at")
    private Instant triggeredAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = FollowUpStatus.PENDING;
        }
        if (this.condition == null) {
            this.condition = FollowUpCondition.NO_REPLY_RECEIVED;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
