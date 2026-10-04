package com.nextmail.controlled.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class ControlledEnvelopeDTO {
    private UUID id;
    private UUID messageId;
    private UUID senderId;
    private String senderEmail;
    private Instant expiresAt;

    @JsonProperty("isRevoked")
    private boolean isRevoked;

    private Instant revokedAt;
    private String revokeReason;

    private boolean allowForwarding;
    private boolean allowPrinting;
    private boolean watermarkRecipient;

    @JsonProperty("isExpired")
    private boolean isExpired;

    @JsonProperty("isAccessible")
    private boolean isAccessible;

    private long viewCount;
    private Instant createdAt;
}
