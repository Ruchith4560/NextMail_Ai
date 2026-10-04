package com.nextmail.controlled.dto;

import com.nextmail.controlled.EnvelopeAuditEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnvelopeAuditLogDTO {
    private UUID id;
    private UUID messageId;
    private UUID viewerId;
    private String viewerEmail;
    private EnvelopeAuditEvent eventType;
    private String ipAddress;
    private String userAgent;
    private Instant createdAt;
}
