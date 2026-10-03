package com.nextmail.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Encapsulates parameters for natural language and structured email searches.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchCriteria {
    private String query;
    private String folder;
    private String sender;
    private String recipient;
    private Boolean hasAttachments;
    private Boolean isStarred;
    private Boolean isRead;
    private Instant startDate;
    private Instant endDate;

    @Builder.Default
    private int page = 0;

    @Builder.Default
    private int size = 20;
}
