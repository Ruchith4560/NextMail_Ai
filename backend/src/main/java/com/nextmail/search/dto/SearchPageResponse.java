package com.nextmail.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Paginated wrapper for email search results with telemetry on execution engine.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchPageResponse {
    private List<SearchResultDTO> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean hasNext;
    private String executedByEngine; // "ELASTICSEARCH" or "POSTGRES_FALLBACK"
}
