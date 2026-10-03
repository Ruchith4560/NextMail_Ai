package com.nextmail.attachment.dto;

import com.nextmail.attachment.AttachmentScanStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Public response DTO for attachment metadata and upload confirmation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentResponseDTO {
    private UUID id;
    private UUID messageId;
    private String filename;
    private String declaredContentType;
    private String detectedContentType;
    private long sizeBytes;
    private String sha256;
    private String storageEngine;
    private AttachmentScanStatus scanStatus;
    private boolean isInline;
    private Instant createdAt;
}
