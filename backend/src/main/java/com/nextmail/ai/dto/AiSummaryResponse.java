package com.nextmail.ai.dto;

import com.nextmail.thread.PriorityTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Structured multi-point thread summary payload for NextMail conversation intelligence.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSummaryResponse {
    private UUID threadId;
    private String overview;
    private List<String> keyDecisions;
    private List<AiActionItemDTO> actionItems;
    private List<String> unresolvedQuestions;
    private PriorityTier priorityTier;
    private double priorityScore;
    private String priorityReason;
    private String suggestedAction;
    private String modelUsed;
    private Instant generatedAt;
}
