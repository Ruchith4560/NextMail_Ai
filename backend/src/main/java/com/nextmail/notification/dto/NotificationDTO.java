package com.nextmail.notification.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.nextmail.notification.NotificationType;
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
public class NotificationDTO {
    private UUID id;
    private UUID userId;
    private String title;
    private String message;
    private NotificationType type;
    private String referenceId;

    @JsonProperty("isRead")
    private boolean isRead;

    private Instant createdAt;
}
