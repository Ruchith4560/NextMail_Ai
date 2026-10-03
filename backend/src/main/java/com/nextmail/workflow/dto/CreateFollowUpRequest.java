package com.nextmail.workflow.dto;

import com.nextmail.workflow.FollowUpCondition;
import jakarta.validation.constraints.NotNull;
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
public class CreateFollowUpRequest {

    @NotNull(message = "threadId is required")
    private UUID threadId;

    private UUID messageId;

    // Either specific dueAt timestamp or relative duration in hours
    private Instant dueAt;
    private Integer durationHours;

    @Builder.Default
    private FollowUpCondition condition = FollowUpCondition.NO_REPLY_RECEIVED;

    private String note;
}
