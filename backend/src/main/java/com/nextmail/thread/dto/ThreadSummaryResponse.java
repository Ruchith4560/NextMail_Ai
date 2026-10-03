package com.nextmail.thread.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.nextmail.thread.PriorityTier;
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
public class ThreadSummaryResponse {
    private UUID id;
    private String subject;
    private String snippet;
    private int messageCount;

    @JsonProperty("hasAttachments")
    private boolean hasAttachments;

    private Instant lastMessageAt;

    @JsonProperty("isRead")
    private boolean isRead;

    @JsonProperty("isStarred")
    private boolean isStarred;

    @JsonProperty("isArchived")
    private boolean isArchived;

    @JsonProperty("isSpam")
    private boolean isSpam;

    @JsonProperty("isTrash")
    private boolean isTrash;

    private PriorityTier priorityTier;
    private Double priorityScore;
    private String priorityReason;
}
