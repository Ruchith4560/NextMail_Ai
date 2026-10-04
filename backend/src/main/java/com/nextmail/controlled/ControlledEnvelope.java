package com.nextmail.controlled;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "controlled_envelopes", indexes = {
        @Index(name = "idx_envelope_message", columnList = "message_id", unique = true),
        @Index(name = "idx_envelope_sender", columnList = "sender_id"),
        @Index(name = "idx_envelope_expires", columnList = "expires_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ControlledEnvelope {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "message_id", nullable = false, unique = true)
    private UUID messageId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(name = "sender_email", nullable = false)
    private String senderEmail;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "is_revoked", nullable = false)
    @Builder.Default
    private boolean isRevoked = false;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoke_reason", length = 500)
    private String revokeReason;

    @Column(name = "allow_forwarding", nullable = false)
    @Builder.Default
    private boolean allowForwarding = false;

    @Column(name = "allow_printing", nullable = false)
    @Builder.Default
    private boolean allowPrinting = false;

    @Column(name = "watermark_recipient", nullable = false)
    @Builder.Default
    private boolean watermarkRecipient = true;

    @Column(name = "is_payload_shredded", nullable = false)
    @Builder.Default
    private boolean isPayloadShredded = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isAccessible() {
        return !isRevoked && !isExpired() && !isPayloadShredded;
    }
}
