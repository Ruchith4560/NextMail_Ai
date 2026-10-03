package com.nextmail.search.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * High-performance search result payload including relevance score and keyword highlights.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultDTO {
    private String messageId;
    private String threadId;
    private String subject;
    private String snippet;
    private String highlightedSnippet;
    private String senderEmail;
    private String senderName;
    private List<String> recipientEmails;
    private String folder;
    private List<String> labels;

    @JsonProperty("hasAttachments")
    private boolean hasAttachments;

    @JsonProperty("isStarred")
    private boolean isStarred;

    @JsonProperty("isRead")
    private boolean isRead;

    @JsonProperty("isControlled")
    private boolean isControlled;

    private Instant receivedAt;
    private float score;
}
