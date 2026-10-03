package com.nextmail.workflow.dto;

import com.nextmail.workflow.FollowUpCondition;
import com.nextmail.workflow.FollowUpStatus;
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
public class FollowUpResponseDTO {
    private UUID id;
    private UUID userId;
    private UUID threadId;
    private String threadSubject;
    private UUID messageId;
    private Instant dueAt;
    private FollowUpCondition condition;
    private FollowUpStatus status;
    private String note;
    private Instant originalLastMessageAt;
    private Instant triggeredAt;
    private Instant resolvedAt;
    private Instant createdAt;
}
