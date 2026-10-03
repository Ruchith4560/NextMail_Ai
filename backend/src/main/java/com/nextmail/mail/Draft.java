package com.nextmail.mail;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "drafts", indexes = {
        @Index(name = "idx_drafts_user_updated", columnList = "user_id, updated_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Draft {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "thread_id")
    private UUID threadId;

    @Column(name = "to_recipients", columnDefinition = "TEXT")
    private String toRecipients;

    @Column(name = "cc_recipients", columnDefinition = "TEXT")
    private String ccRecipients;

    @Column(name = "bcc_recipients", columnDefinition = "TEXT")
    private String bccRecipients;

    @Column(length = 500)
    private String subject;

    @Column(name = "body_text", columnDefinition = "TEXT")
    private String bodyText;

    @Column(name = "is_controlled", nullable = false)
    @Builder.Default
    private boolean isControlled = false;

    @Column(name = "expiry_hours")
    @Builder.Default
    private Integer expiryHours = 48;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
