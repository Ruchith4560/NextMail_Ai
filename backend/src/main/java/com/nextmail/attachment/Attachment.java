package com.nextmail.attachment;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Persisted attachment metadata.
 * Enforces cryptographic SHA-256 deduplication and deep MIME detection via Apache Tika.
 */
@Entity
@Table(name = "attachments", indexes = {
        @Index(name = "idx_attachments_user_id", columnList = "user_id"),
        @Index(name = "idx_attachments_message_id", columnList = "message_id"),
        @Index(name = "idx_attachments_sha256", columnList = "sha256")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "message_id")
    private UUID messageId;

    @Column(nullable = false, length = 255)
    private String filename;

    @Column(name = "declared_content_type", length = 128)
    private String declaredContentType;

    @Column(name = "detected_content_type", nullable = false, length = 128)
    private String detectedContentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "storage_engine", nullable = false, length = 32)
    private String storageEngine; // "S3_MINIO" or "LOCAL_FS"

    @Enumerated(EnumType.STRING)
    @Column(name = "scan_status", nullable = false, length = 32)
    @Builder.Default
    private AttachmentScanStatus scanStatus = AttachmentScanStatus.CLEAN;

    @Column(name = "is_inline", nullable = false)
    @Builder.Default
    private boolean isInline = false;

    @Column(name = "content_id", length = 255)
    private String contentId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
