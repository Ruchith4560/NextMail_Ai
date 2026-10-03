package com.nextmail.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Concrete action item extracted by AI from email thread context.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiActionItemDTO {
    private String task;
    private String assignee;
    private String dueSuggestion;
}
